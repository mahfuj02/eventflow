import { test, expect } from '@playwright/test'
import { getIdToken, loginAs } from '../support/auth'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'

test.describe('Past-event behavior', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('absent from public browse, present on Dashboard as Ended, revenue still counted', async ({
    page,
    request,
  }) => {
    const { eventId } = await seedEventWithSales(request, {
      organizerId: testAccounts.host.firebaseUid(),
      endsInPast: true,
    })

    // Absent from public browse
    await page.goto('/')
    await expect(page.getByTestId('event-card')).toHaveCount(0)

    // Present on Dashboard, flagged Ended
    await loginAs(page, 'host')
    const row = page.getByTestId(`dashboard-event-row-${eventId}`)
    await expect(row).toBeVisible()
    await expect(row.getByTestId('dashboard-status-pill')).toHaveText('Ended')

    // Revenue/sold still roll into the summary totals (seed creates 2 sold @ $20.00 each)
    await expect(page.getByTestId('summary-tickets-sold')).toHaveText('2')
    await expect(page.getByTestId('summary-total-revenue')).toContainText('40')
  })

  test('detail page shows "ended" panel instead of the ticket selector', async ({ page, request }) => {
    const { eventId } = await seedEventWithSales(request, {
      organizerId: testAccounts.host.firebaseUid(),
      endsInPast: true,
    })
    await page.goto(`/events/${eventId}`)
    await expect(page.getByTestId('event-ended-panel')).toBeVisible()
    await expect(page.getByTestId('checkout-button')).toHaveCount(0)
  })

  test('checkout-session creation is rejected for an ended event', async ({ request }) => {
    const { eventId, ticketTypeId } = await seedEventWithSales(request, {
      organizerId: testAccounts.host.firebaseUid(),
      endsInPast: true,
    })
    const idToken = await getIdToken(request, 'guest')
    const response = await request.post('/.netlify/functions/create-checkout-session', {
      data: { eventId, items: [{ ticketTypeId, quantity: 1 }] },
      headers: { Authorization: `Bearer ${idToken}` },
    })
    expect(response.status()).toBe(400)
  })
})
