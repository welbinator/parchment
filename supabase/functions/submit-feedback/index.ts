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

const FEEDBACK_PAGE_ID = 'e817d8ca-8987-4547-8a81-845033c9f63e'

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

    const { email, message, contact_ok } = await req.json()

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: corsHeaders })
    }

    // Check if user is blocked
    const { data: blocked } = await supabase
      .from('feedback_blocked')
      .select('id')
      .eq('email', user.email ?? email)
      .maybeSingle()

    if (blocked) {
      return new Response(JSON.stringify({ error: 'Feedback submission not allowed' }), { status: 403, headers: corsHeaders })
    }

    // Save to feedback table
    await supabase.from('feedback').insert({
      user_id: user.id,
      email: user.email ?? email,
      message: message.trim(),
      contact_ok: contact_ok ?? false,
    })

    // Get current max block position on the feedback page
    const { data: existingBlocks } = await supabase
      .from('blocks')
      .select('position')
      .eq('page_id', FEEDBACK_PAGE_ID)
      .order('position', { ascending: false })
      .limit(1)

    const nextPos = (existingBlocks?.[0]?.position ?? 0) + 1
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })
    const contactStr = contact_ok ? '✅ OK to contact' : '🚫 Do not contact'

    // Append blocks to the feedback page
    await supabase.from('blocks').insert([
      { page_id: FEEDBACK_PAGE_ID, type: 'heading2', content: `${user.email ?? email} — ${timestamp}`, position: nextPos },
      { page_id: FEEDBACK_PAGE_ID, type: 'text', content: message.trim(), position: nextPos + 1 },
      { page_id: FEEDBACK_PAGE_ID, type: 'text', content: contactStr, position: nextPos + 2 },
      { page_id: FEEDBACK_PAGE_ID, type: 'divider', content: '', position: nextPos + 3 },
    ])

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
