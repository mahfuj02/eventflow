import { test, expect, type Page } from '@playwright/test'
import { loginAs } from '../support/auth'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'

async function assertHostNav(page: Page) {
  await expect(page.getByTestId('nav-my-tickets-link')).toBeVisible()
  await expect(page.getByTestId('nav-dashboard-link')).toBeVisible()
  await page.getByTestId('nav-avatar-button').click()
  await expect(page.getByTestId('nav-logout-button')).toBeVisible()
  await expect(page.getByTestId('nav-logout-button')).toHaveText('Log out')
  await page.getByTestId('nav-avatar-button').click() // close the dropdown again
}

test.describe('Nav consistency (host)', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('identical nav renders on Home, an event detail page, Dashboard, and My Tickets', async ({
    page,
    request,
  }) => {
    const { eventId } = await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    await loginAs(page, 'host')

    await page.goto('/')
    await assertHostNav(page)

    await page.goto(`/events/${eventId}`)
    await assertHostNav(page)

    await page.goto('/dashboard')
    await assertHostNav(page)

    await page.goto('/home')
    await assertHostNav(page)
  })
})
