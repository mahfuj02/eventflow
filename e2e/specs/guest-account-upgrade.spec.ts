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
    const { eventId } = await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    const buyerEmail = `e2e-upgrade-source-${Date.now()}@test.eventflow.dev`

    await page.goto(`/events/${eventId}`)
    await page.getByTestId(/^ticket-increment-/).first().click()
    await page.getByTestId('checkout-button').click()
    await payWithTestCard(page, buyerEmail)

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
