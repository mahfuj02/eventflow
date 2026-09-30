import Stripe from 'stripe'

let client: Stripe | null = null

function getStripeClient(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set for e2e tests')
    client = new Stripe(key)
  }
  return client
}

// Confirms the Checkout Session's underlying PaymentIntent with a Stripe
// test payment method, flipping payment_status to 'paid' without driving
// Stripe's hosted UI at all - what every test uses except the dedicated
// smoke tests, which drive the real Checkout page with the 4242 test card.
export async function markCheckoutSessionPaid(sessionId: string): Promise<void> {
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!paymentIntentId) {
    throw new Error('Checkout session has no payment_intent to confirm')
  }
  await stripe.paymentIntents.confirm(paymentIntentId, { payment_method: 'pm_card_visa' })
}

// Stripe's hosted Checkout URL looks like
// https://checkout.stripe.com/c/pay/cs_test_XXXX#fidkdW... - the session
// id is the path segment right after /pay/.
export function extractSessionIdFromUrl(checkoutUrl: string): string {
  const match = checkoutUrl.match(/\/pay\/(cs_[^#/?]+)/)
  if (!match) {
    throw new Error(`Could not extract a Checkout Session id from URL: ${checkoutUrl}`)
  }
  return match[1]
}
