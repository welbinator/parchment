const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://theparchment.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// skipcq: JS-0067
async function getUser(authHeader: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: SERVICE_ROLE_KEY },
  })
  if (!res.ok) return null
  return res.json()
}

// skipcq: JS-0067
async function getSubscription(userId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_customer_id`,
    { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } }
  )
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const user = await getUser(authHeader)
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const sub = await getSubscription(user.id)
    if (!sub?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found. Please upgrade first.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: sub.stripe_customer_id,
        return_url: `${APP_URL}/settings`,
      }),
    })
    const portal = await portalRes.json()

    if (!portal.url) {
      return new Response(JSON.stringify({ error: 'Failed to create portal session', detail: portal }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ url: portal.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
