import { test, expect } from '@playwright/test'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'
import { payWithTestCard } from '../support/stripeCheckoutUi'

// Real browser + real Stripe UI, same as guest-checkout-smoke.spec.ts - not
// an "API shortcut" test. Stripe doesn't create a Checkout Session's
// PaymentIntent until a real client confirms the session (API version
// 2022-08-01+), so there's no supported way to mark a hosted Checkout
// Session paid without driving Stripe's actual page. What's distinct here
// from the smoke test: buying more than one of the same ticket type, and
// confirming confirm-order.mts is idempotent on a page reload.
test.describe('Guest checkout (multiple tickets, real Stripe UI)', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('buying two tickets produces two codes, and reconfirming on reload is idempotent', async ({
    page,
    request,
  }) => {
    await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })

    await page.goto('/')
    await page.getByTestId('event-card').getByText('View event →').click()
    await page.getByTestId(/^ticket-increment-/).first().click()
    await page.getByTestId(/^ticket-increment-/).first().click()
    await page.getByTestId('checkout-button').click()

    await payWithTestCard(page, `e2e-checkout-${Date.now()}@test.eventflow.dev`)

    await expect(page.getByTestId('ticket-code-card')).toHaveCount(2)
    const codes = await page.getByTestId('ticket-code-card').allTextContents()

    // As if the success page reloaded - confirm-order must be idempotent:
    // same tickets returned, nothing duplicated.
    await page.reload()
    await expect(page.getByTestId('ticket-code-card')).toHaveCount(2)
    const codesAfterReload = await page.getByTestId('ticket-code-card').allTextContents()
    expect(codesAfterReload).toEqual(codes)
  })
})
