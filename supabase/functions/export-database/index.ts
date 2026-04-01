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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Vary': 'Origin',
  }
}

const ADMIN_EMAIL = 'james.welbes@gmail.com'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to read all data across all users
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Export all tables in parallel
    const [profiles, collections, pages, blocks, apiKeys, apiKeyUsage] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('collections').select('*').order('created_at'),
      supabase.from('pages').select('*').order('created_at'),
      supabase.from('blocks').select('*').order('created_at'),
      supabase.from('api_keys').select('id, name, key_prefix, user_id, created_at, expires_at, revoked, last_used_at, can_create_collections, can_delete_collections, can_create_pages, can_delete_pages, can_read_pages, can_write_blocks').order('created_at'),
      supabase.from('api_key_usage').select('*').order('usage_date'),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      tables: {
        profiles: { count: profiles.data?.length ?? 0, rows: profiles.data ?? [] },
        collections: { count: collections.data?.length ?? 0, rows: collections.data ?? [] },
        pages: { count: pages.data?.length ?? 0, rows: pages.data ?? [] },
        blocks: { count: blocks.data?.length ?? 0, rows: blocks.data ?? [] },
        api_keys: { count: apiKeys.data?.length ?? 0, rows: apiKeys.data ?? [] },
        api_key_usage: { count: apiKeyUsage.data?.length ?? 0, rows: apiKeyUsage.data ?? [] },
      },
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="parchment-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
