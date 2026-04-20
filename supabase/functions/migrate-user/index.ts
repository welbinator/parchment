const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const ALLOWED_ORIGINS = new Set([
  'https://theparchment.app',
  'https://staging.theparchment.app',
  'http://localhost:8080',
  'http://localhost:5173',
])

// skipcq: JS-0067
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://theparchment.app'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

// skipcq: JS-0067
function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = crypto.getRandomValues(new Uint8Array(40))
  let key = 'pmt_'
  for (let i = 0; i < 40; i++) key += chars.charAt(randomValues[i] % chars.length)
  return key
}

// skipcq: JS-0067
async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// skipcq: JS-0067
async function getUser(authHeader: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: ANON_KEY },
  })
  if (!res.ok) return null
  return res.json()
}

// skipcq: JS-0067
async function rest(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) return { data: null, error: await res.text() }
  const text = await res.text()
  return { data: text ? JSON.parse(text) : null, error: null }
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

    const user = await getUser(authHeader)
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newUuid = user.id
    const email = user.email

    // Find orphaned profile matching this email
    const { data: orphanedProfiles } = await rest('GET', `profiles?email=eq.${encodeURIComponent(email)}&user_id=neq.${newUuid}&select=user_id,email,display_name&limit=1`)
    const orphanedProfile = orphanedProfiles?.[0] ?? null

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
    const { error: collectionsError } = await rest('PATCH', `collections?user_id=eq.${oldUuid}`, { user_id: newUuid })
    if (collectionsError) throw new Error(collectionsError)

    const { error: pagesError } = await rest('PATCH', `pages?user_id=eq.${oldUuid}`, { user_id: newUuid })
    if (pagesError) throw new Error(pagesError)

    // Restore API keys
    const { data: oldKeys } = await rest('GET', `api_keys?user_id=eq.${oldUuid}&revoked=eq.false&select=*`)
    const newKeys: string[] = []

    if (oldKeys && oldKeys.length > 0) {
      for (const oldKey of oldKeys) {
        const rawKey = generateKey()
        const keyHash = await hashKey(rawKey)
        const keyPrefix = rawKey.slice(0, 8)
        await rest('POST', 'api_keys', {
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
        }, { Prefer: 'return=minimal' })
        newKeys.push(rawKey)
      }
      await rest('PATCH', `api_keys?user_id=eq.${oldUuid}`, { revoked: true })
    }

    // Delete the orphaned profile
    await rest('DELETE', `profiles?user_id=eq.${oldUuid}`)

    return new Response(JSON.stringify({ migrated: true, new_api_keys: newKeys }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
