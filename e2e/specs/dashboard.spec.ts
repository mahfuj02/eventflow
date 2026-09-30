import { test, expect } from '@playwright/test'
import { loginAs } from '../support/auth'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'

test.describe('Dashboard correctness', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('summary cards reflect the seeded ticket/revenue totals', async ({ page, request }) => {
    await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    await loginAs(page, 'host')

    await expect(page.getByTestId('summary-tickets-sold')).toHaveText('2')
    await expect(page.getByTestId('summary-total-revenue')).toContainText('40')
    await expect(page.getByTestId('summary-active-events')).toHaveText('1')
    await expect(page.getByText('Revenue overview')).toBeVisible()
  })

  test('per-event guest list shows a row per seeded ticket', async ({ page, request }) => {
    const { eventId } = await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    await loginAs(page, 'host')
    await page.goto(`/events/${eventId}/guests`)
    await expect(page.getByText('Guests (2)')).toBeVisible()
  })
})
