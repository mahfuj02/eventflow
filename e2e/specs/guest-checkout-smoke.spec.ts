import { test, expect } from '@playwright/test'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'
import { payWithTestCard } from '../support/stripeCheckoutUi'

// Full real-browser, real-Stripe-UI smoke test. Deliberately not part of
// the API-shortcut suite in guest-checkout.spec.ts - this is the one that
// exercises the exact path that broke in production before the
// frontend/public/_redirects fix (Stripe's hosted page redirecting back
// to /orders/success on a domain serving static files only).
//
// Stripe's hosted Checkout page structure is outside this repo's control;
// if Stripe changes it, only this spec (and support/stripeCheckoutUi.ts)
// should need updating.
test.describe('Guest checkout (real Stripe UI smoke test)', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('buying a ticket through the real Stripe Checkout page confirms the order', async ({ page, request }) => {
    await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })

    await page.goto('/')
    await page.getByTestId('event-card').getByText('View event →').click()
    await page.getByTestId(/^ticket-increment-/).first().click()
    await page.getByTestId('checkout-button').click()

    // A unique email each run, not a fixed one - Stripe Link remembers an
    // email server-side once "Save my information" has ever been checked
    // for it, and will then force a "confirm it's you" step on every later
    // checkout regardless of that checkbox's state on the later attempt.
    await payWithTestCard(page, `e2e-smoke-${Date.now()}@test.eventflow.dev`)

    await expect(page.getByTestId('ticket-code-card')).toBeVisible()
    await expect(page.getByText("You're all set!")).toBeVisible()
  })
})
