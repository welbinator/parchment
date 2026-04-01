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

    // Verify the user's JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { flag, enabled } = await req.json()
    if (!flag || typeof enabled !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Missing flag or enabled' }), { status: 400, headers: corsHeaders })
    }

    // Fetch current flag
    const { data: flagData, error: flagError } = await supabase
      .from('feature_flags')
      .select('id, enabled_for')
      .eq('flag', flag)
      .maybeSingle()

    if (flagError || !flagData) {
      return new Response(JSON.stringify({ error: 'Flag not found' }), { status: 404, headers: corsHeaders })
    }

    const current: string[] = Array.isArray(flagData.enabled_for) ? flagData.enabled_for : []
    let updated: string[]

    if (enabled && !current.includes(user.id)) {
      updated = [...current, user.id]
    } else if (!enabled && current.includes(user.id)) {
      updated = current.filter((id: string) => id !== user.id)
    } else {
      // No change needed
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    const { error: updateError } = await supabase
      .from('feature_flags')
      .update({ enabled_for: updated })
      .eq('id', flagData.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
