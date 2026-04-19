const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',')
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2)
  const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3)
  if (!timestamp || !v1) return false
  const signedPayload = `${timestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return expected === v1
}

async function updateSubscription(filter: Record<string, string>, data: Record<string, unknown>) {
  const params = new URLSearchParams(filter as Record<string, string>)
  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?${params}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

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
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  const valid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)
  if (!valid) return new Response('Invalid signature', { status: 400 })

  const event = JSON.parse(body)
  const subscription = event.data?.object
  const userId = subscription?.metadata?.user_id

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const plan = (subscription.status === 'active' || subscription.status === 'trialing') ? 'pro' : 'free'
    const payload = {
      plan,
      status: subscription.status,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (userId) {
      await upsertSubscription(userId, payload)
    } else {
      await updateSubscription({ 'stripe_customer_id': `eq.${subscription.customer}` }, payload)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const payload = { plan: 'free', status: 'canceled', stripe_subscription_id: null, current_period_end: null, updated_at: new Date().toISOString() }
    if (userId) {
      await updateSubscription({ 'user_id': `eq.${userId}` }, payload)
    } else {
      await updateSubscription({ 'stripe_customer_id': `eq.${subscription.customer}` }, payload)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const custId = event.data?.object?.customer
    if (custId) {
      await updateSubscription({ 'stripe_customer_id': `eq.${custId}` }, { status: 'past_due', updated_at: new Date().toISOString() })
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
