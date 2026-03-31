import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://theparchment.app',
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Parse request body for specific report type
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch (_) { /* no body = summary */ }

    if (body.report === 'users') {
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, avatar_url, created_at')
        .order('created_at', { ascending: false })

      if (!users) return new Response(JSON.stringify({ users: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

      // For each user, get collections count, pages count, and last active
      const enriched = await Promise.all(users.map(async (u) => {
        const [collectionsRes, pagesRes, lastPageRes, lastBlockRes] = await Promise.all([
          supabase.from('collections').select('id', { count: 'exact', head: true }).eq('user_id', u.user_id).is('deleted_at', null),
          supabase.from('pages').select('id', { count: 'exact', head: true }).eq('user_id', u.user_id).is('deleted_at', null),
          supabase.from('pages').select('updated_at').eq('user_id', u.user_id).order('updated_at', { ascending: false }).limit(1),
          supabase.from('blocks').select('created_at, pages!inner(user_id)').eq('pages.user_id', u.user_id).order('created_at', { ascending: false }).limit(1),
        ])

        const lastPage = lastPageRes.data?.[0]?.updated_at ?? null
        const lastBlock = (lastBlockRes.data?.[0] as any)?.created_at ?? null

        // Use whichever is most recent
        let last_active: string | null = null
        if (lastPage && lastBlock) {
          last_active = lastPage > lastBlock ? lastPage : lastBlock
        } else {
          last_active = lastPage ?? lastBlock
        }

        return {
          ...u,
          collections_count: collectionsRes.count ?? 0,
          pages_count: pagesRes.count ?? 0,
          last_active,
        }
      }))

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Default: summary counts
    const [usersRes, collectionsRes, pagesRes, apiKeysRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('collections').select('id', { count: 'exact', head: true }),
      supabase.from('pages').select('id', { count: 'exact', head: true }),
      supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('revoked', false),
    ])

    return new Response(JSON.stringify({
      unique_users: usersRes.count ?? 0,
      total_collections: collectionsRes.count ?? 0,
      total_pages: pagesRes.count ?? 0,
      total_api_keys: apiKeysRes.count ?? 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
