import { test, expect } from '@playwright/test'
import { testAccounts } from '../support/env'
import { resetTestData, seedEventWithSales } from '../support/seed'

test.describe('Public browsing (logged out)', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('Home shows the empty state with no events', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('No events yet.')).toBeVisible()
  })

  test('search filters the list by title', async ({ page, request }) => {
    await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    await page.goto('/')
    await expect(page.getByTestId('event-card')).toHaveCount(1)

    await page.getByPlaceholder('Search events, venues, or cities').fill('Nonexistent Event Title')
    await expect(page.getByText('No events match your search.')).toBeVisible()

    await page.getByPlaceholder('Search events, venues, or cities').fill('E2E Seeded Event')
    await expect(page.getByTestId('event-card').filter({ hasText: 'E2E Seeded Event' })).toBeVisible()
  })

  test('a past event does not appear in Upcoming events', async ({ page, request }) => {
    await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid(), endsInPast: true })
    await page.goto('/')
    await expect(page.getByTestId('event-card')).toHaveCount(0)
    await expect(page.getByText('No events yet.')).toBeVisible()
  })

  test('clicking a card navigates to its detail page', async ({ page, request }) => {
    const { eventId } = await seedEventWithSales(request, { organizerId: testAccounts.host.firebaseUid() })
    await page.goto('/')
    await page.getByTestId('event-card').getByText('View event →').click()
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}$`))
    await expect(page.getByRole('heading', { name: 'E2E Seeded Event' })).toBeVisible()
  })
})
