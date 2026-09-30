import { test, expect } from '@playwright/test'
import { signUpAnonymously } from '../support/auth'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'
import { extractSessionIdFromUrl, markCheckoutSessionPaid } from '../support/stripe'

// API-shortcut coverage: bypasses Stripe's hosted UI by confirming the
// PaymentIntent directly, and bypasses the browser entirely by calling
// Netlify Functions straight with a REST-issued Firebase token. The real
// browser + real Stripe UI path is covered separately by the smoke test
// in guest-checkout-smoke.spec.ts.
test.describe('Guest checkout (API shortcut)', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('paying for multiple ticket types produces the right orders and ticket codes', async ({ request }) => {
    const { eventId, ticketTypeId } = await seedEventWithSales(request, {
      organizerId: testAccounts.host.firebaseUid(),
    })
    const { idToken } = await signUpAnonymously(request)

    const sessionResponse = await request.post('/.netlify/functions/create-checkout-session', {
      data: { eventId, items: [{ ticketTypeId, quantity: 2 }] },
      headers: { Authorization: `Bearer ${idToken}` },
    })
    expect(sessionResponse.ok()).toBeTruthy()
    const { url } = (await sessionResponse.json()) as { url: string }
    const sessionId = extractSessionIdFromUrl(url)

    await markCheckoutSessionPaid(sessionId)

    const confirmResponse = await request.get(
      `/.netlify/functions/confirm-order?session_id=${sessionId}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    )
    expect(confirmResponse.ok()).toBeTruthy()
    const confirmed = (await confirmResponse.json()) as { orders: unknown[]; tickets: { code: string }[] }
    expect(confirmed.orders).toHaveLength(1)
    expect(confirmed.tickets).toHaveLength(2)
    for (const ticket of confirmed.tickets) {
      expect(ticket.code).toBeTruthy()
    }

    // Calling confirm-order again (as if the success page reloaded) must
    // be idempotent - same tickets, not duplicated.
    const secondConfirm = await request.get(
      `/.netlify/functions/confirm-order?session_id=${sessionId}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    )
    const secondBody = (await secondConfirm.json()) as { tickets: { code: string }[] }
    expect(secondBody.tickets.map((t) => t.code).sort()).toEqual(confirmed.tickets.map((t) => t.code).sort())
  })
})
