import { createClient } from 'npm:@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json()
    const { raw_key, name, key_type, workspace_ids, expires_at, can_manage_workspaces,
            can_create_collections, can_delete_collections, can_create_pages,
            can_delete_pages, can_read_pages, can_write_blocks } = body

    if (!raw_key || typeof raw_key !== 'string') {
      return new Response(JSON.stringify({ error: 'raw_key is required' }), { status: 400, headers: corsHeaders })
    }

    const { data: hashData, error: hashError } = await supabase.rpc('hmac_api_key', { p_key: raw_key })
    if (hashError || !hashData) {
      console.error('[create-api-key] hash error:', hashError)
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders })
    }

    const keyPrefix = raw_key.slice(0, 8)

    const { error: insertError } = await supabase.from('api_keys').insert({
      user_id: user.id,
      key_hash: hashData,
      key_prefix: keyPrefix,
      name: name || 'Untitled Key',
      key_type: key_type || 'master',
      workspace_ids: workspace_ids || null,
      expires_at: expires_at || null,
      can_manage_workspaces: can_manage_workspaces ?? false,
      can_create_collections: can_create_collections ?? true,
      can_delete_collections: can_delete_collections ?? false,
      can_create_pages: can_create_pages ?? true,
      can_delete_pages: can_delete_pages ?? false,
      can_read_pages: can_read_pages ?? true,
      can_write_blocks: can_write_blocks ?? true,
    })

    if (insertError) {
      console.error('[create-api-key] insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
  } catch (e) {
    console.error('[create-api-key] unhandled error:', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders })
  }
})
