const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') ?? ''
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
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_customer_id,plan`,
    { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } }
  )
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] ?? null
}

// skipcq: JS-0067
async function upsertSubscription(userId: string, data: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ user_id: userId, ...data }),
  })
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

    if (sub?.plan === 'pro') {
      return new Response(JSON.stringify({ error: 'Already on Pro plan' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get or create Stripe customer
    let customerId = sub?.stripe_customer_id
    if (!customerId) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ email: user.email ?? '', 'metadata[user_id]': user.id }),
      })
      const customer = await customerRes.json()
      customerId = customer.id
      await upsertSubscription(user.id, { stripe_customer_id: customerId, plan: 'free', status: 'active' })
    }

    // Create Stripe Checkout Session
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        mode: 'subscription',
        'line_items[0][price]': STRIPE_PRICE_ID,
        'line_items[0][quantity]': '1',
        success_url: `${APP_URL}/settings?upgraded=true`,
        cancel_url: `${APP_URL}/settings`,
        'subscription_data[metadata][user_id]': user.id,
      }),
    })
    const session = await sessionRes.json()

    if (!session.url) {
      return new Response(JSON.stringify({ error: 'Failed to create checkout session', detail: session }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
