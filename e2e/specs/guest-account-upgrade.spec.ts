import { test, expect } from '@playwright/test'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'
import { payWithTestCard } from '../support/stripeCheckoutUi'

// Builds on a real completed checkout (not the API shortcut): the upgrade
// form's email field is read-only and only ever gets populated once a real
// purchase captures the buyer's email via confirm-order.mts, so this needs
// genuine browser + Stripe continuity, same as the smoke test.
test.describe('Guest to account upgrade', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('after a real anonymous checkout, the guest can upgrade to a full account', async ({ page, request }) => {
    // More sequential real-network steps than any other spec (real Stripe
    // checkout, then a further real page navigation and form submission on
    // top of that) - the default 30s per-test timeout is comfortable for
    // every other spec but tight here, especially since this file runs
    // alphabetically before guest-checkout*.spec.ts and so is often the
    // first real hit on confirm-order.mts's Netlify Dev cold start too.
    test.setTimeout(60_000)

    const { eventId } = await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    const buyerEmail = `e2e-upgrade-source-${Date.now()}@test.eventflow.dev`

    await page.goto(`/events/${eventId}`)
    await page.getByTestId(/^ticket-increment-/).first().click()
    await page.getByTestId('checkout-button').click()
    await payWithTestCard(page, buyerEmail)
    // payWithTestCard only waits for the URL to reach /orders/success - the
    // page's own confirm-order call (which is what persists buyerEmail onto
    // the guest doc) is still in flight at that point. Navigating away too
    // early can cancel that request, leaving the guest doc's email unset.
    await expect(page.getByTestId('ticket-code-card').first()).toBeVisible()

    await page.goto('/home')
    await expect(page.getByTestId('guest-upgrade-banner')).toBeVisible()

    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByLabel('Email')).toHaveValue(buyerEmail)
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm password').fill('TestPassword123!')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByTestId('guest-upgrade-banner')).toHaveCount(0)
  })
})
