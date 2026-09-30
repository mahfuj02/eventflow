import path from 'node:path'
import { test, expect } from '@playwright/test'
import { getIdToken, loginAs } from '../support/auth'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'

test.describe('Event management (host)', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('create an event with two ticket types and a banner', async ({ page }) => {
    await loginAs(page, 'host')
    await page.goto('/events/new')

    await page.getByTestId('banner-file-input').setInputFiles(path.join(__dirname, '../fixtures/test-banner.jpg'))
    await expect(page.getByRole('button', { name: 'Change' })).toBeVisible()

    await page.getByLabel('Title').fill('E2E Created Event')
    await page.getByLabel('Description').fill('Created by the e2e suite.')
    await page.getByLabel('Venue').fill('E2E Venue')
    await page.getByLabel('Starts at').fill('2027-01-01T18:00')
    await page.getByLabel('Ends at').fill('2027-01-01T21:00')

    const rows = page.locator('fieldset')
    await rows.nth(0).getByLabel('Name').fill('General')
    await rows.nth(0).getByLabel('Price (USD)').fill('20')
    await rows.nth(0).getByLabel('Quantity available').fill('50')

    await page.getByRole('button', { name: '+ Add another ticket type' }).click()
    await rows.nth(1).getByLabel('Name').fill('VIP')
    await rows.nth(1).getByLabel('Price (USD)').fill('50')
    await rows.nth(1).getByLabel('Quantity available').fill('10')

    await page.getByRole('button', { name: 'Create event' }).click()
    await page.waitForURL('**/dashboard')

    await expect(page.getByRole('cell', { name: 'E2E Created Event', exact: true })).toBeVisible()
  })

  test('editing core fields and adding a new ticket type on an event with existing sales', async ({ page, request }) => {
    const { eventId } = await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    await loginAs(page, 'host')
    await page.goto(`/events/${eventId}/edit`)

    await expect(page.getByText('already sold')).toBeVisible()
    await expect(page.locator('fieldset').first().getByRole('button', { name: 'Remove' })).toHaveCount(0)

    await page.getByLabel('Description').fill('Updated by the e2e suite.')
    await page.getByRole('button', { name: '+ Add another ticket type' }).click()
    const newRow = page.locator('fieldset').nth(1)
    await newRow.getByLabel('Name').fill('Early Bird')
    await newRow.getByLabel('Price (USD)').fill('15')
    await newRow.getByLabel('Quantity available').fill('20')

    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.waitForURL('**/dashboard')
  })

  test('reducing quantity below sold count is rejected server-side', async ({ request }) => {
    const { eventId, ticketTypeId } = await seedEventWithSales(request, {
      organizerId: testAccounts.host.firebaseUid(),
    })
    const token = await getIdToken(request, 'host')
    const patchResponse = await request.fetch(`/.netlify/functions/update-event?eventId=${eventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        title: 'E2E Seeded Event',
        description: 'Seeded event with an existing sale',
        venue: 'Test Venue',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        // seed's quantitySold is 2 - 1 is a valid positive integer but
        // still below that, so this exercises the actual "can't reduce
        // below sold count" rule rather than basic field validation
        ticketTypes: [{ id: ticketTypeId, name: 'General', price: 2000, quantityTotal: 1 }],
      },
    })
    expect(patchResponse.status()).toBe(400)
  })

  test('deleting an event with zero sales removes it; deleting one with sales is blocked', async ({
    page,
    request,
  }) => {
    const { eventId: eventWithSalesId } = await seedEventWithSales(request, {
      organizerId: testAccounts.host.firebaseUid(),
    })

    await loginAs(page, 'host')
    await page.goto('/events/new')
    await page.getByLabel('Title').fill('E2E Zero Sales Event')
    await page.getByLabel('Description').fill('No sales, safe to delete.')
    await page.getByLabel('Venue').fill('E2E Venue')
    await page.getByLabel('Starts at').fill('2027-02-01T18:00')
    await page.getByLabel('Ends at').fill('2027-02-01T21:00')
    await page.locator('fieldset').first().getByLabel('Name').fill('General')
    await page.locator('fieldset').first().getByLabel('Price (USD)').fill('10')
    await page.locator('fieldset').first().getByLabel('Quantity available').fill('5')
    const createResponse = page.waitForResponse('**/create-event')
    await page.getByRole('button', { name: 'Create event' }).click()
    const created = (await (await createResponse).json()) as { _id: string }
    await page.waitForURL('**/dashboard')

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByTestId(`dashboard-event-row-${created._id}`).getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByTestId(`dashboard-event-row-${created._id}`)).toHaveCount(0)

    page.once('dialog', (dialog) => dialog.accept())
    await page
      .getByTestId(`dashboard-event-row-${eventWithSalesId}`)
      .getByRole('button', { name: 'Delete' })
      .click()
    await expect(page.getByText("Can't delete an event with existing ticket sales")).toBeVisible()
    await expect(page.getByTestId(`dashboard-event-row-${eventWithSalesId}`)).toBeVisible()
  })
})
