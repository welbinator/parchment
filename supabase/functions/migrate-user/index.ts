import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://theparchment.app',
  'https://staging.theparchment.app',
  'http://localhost:8080',
  'http://localhost:5173',
])

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://theparchment.app'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'pmt_'
  for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  return key
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json().catch(() => ({}))
    const dryRun = body.dry_run === true

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newUuid = user.id
    const email = user.email

    // Find orphaned profile matching this email
    const { data: orphanedProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, display_name')
      .eq('email', email)
      .neq('user_id', newUuid)
      .maybeSingle()

    if (!orphanedProfile) {
      return new Response(JSON.stringify({ migrated: false, needs_migration: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (dryRun) {
      return new Response(JSON.stringify({ migrated: false, needs_migration: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const oldUuid = orphanedProfile.user_id

    // Reassign collections and pages
    const { error: collectionsError } = await supabaseAdmin
      .from('collections')
      .update({ user_id: newUuid })
      .eq('user_id', oldUuid)
    if (collectionsError) throw collectionsError

    const { error: pagesError } = await supabaseAdmin
      .from('pages')
      .update({ user_id: newUuid })
      .eq('user_id', oldUuid)
    if (pagesError) throw pagesError

    // Restore API keys — generate new key values since hashes can't be reversed
    const { data: oldKeys } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('user_id', oldUuid)
      .eq('revoked', false)

    const newKeys: string[] = []
    if (oldKeys && oldKeys.length > 0) {
      for (const oldKey of oldKeys) {
        const rawKey = generateKey()
        const keyHash = await hashKey(rawKey)
        const keyPrefix = rawKey.slice(0, 8)
        await supabaseAdmin.from('api_keys').insert({
          user_id: newUuid,
          name: oldKey.name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          can_read_pages: oldKey.can_read_pages,
          can_write_blocks: oldKey.can_write_blocks,
          can_create_pages: oldKey.can_create_pages,
          can_delete_pages: oldKey.can_delete_pages,
          can_create_collections: oldKey.can_create_collections,
          can_delete_collections: oldKey.can_delete_collections,
          expires_at: oldKey.expires_at,
        })
        newKeys.push(rawKey)
      }
      // Delete old orphaned keys
      await supabaseAdmin.from('api_keys').delete().eq('user_id', oldUuid)
    }

    // Delete the orphaned profile
    await supabaseAdmin.from('profiles').delete().eq('user_id', oldUuid)

    return new Response(JSON.stringify({
      migrated: true,
      new_api_keys: newKeys, // Return new key values so we can show them to user
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
