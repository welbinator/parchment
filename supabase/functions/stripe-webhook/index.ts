import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

// Stripe signature verification
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',')
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2)
  const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3)
  if (!timestamp || !v1) return false

  const signedPayload = `${timestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return expected === v1
}

Deno.serve(async (req) => {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  const valid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)
  if (!valid) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)
  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const subscription = event.data?.object

  // Extract user_id from subscription metadata
  const userId = subscription?.metadata?.user_id

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const plan = subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free'
    const status = subscription.status // active, canceled, past_due, trialing

    if (userId) {
      await adminSupabase.from('subscriptions').upsert({
        user_id: userId,
        plan,
        status,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } else {
      // Fallback: look up by stripe_customer_id
      await adminSupabase.from('subscriptions').update({
        plan,
        status,
        stripe_subscription_id: subscription.id,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', subscription.customer)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    if (userId) {
      await adminSupabase.from('subscriptions').update({
        plan: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      }, ).eq('user_id', userId)
    } else {
      await adminSupabase.from('subscriptions').update({
        plan: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', subscription.customer)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const custId = event.data?.object?.customer
    if (custId) {
      await adminSupabase.from('subscriptions').update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', custId)
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
