import { test, expect } from '@playwright/test'
import { loginAs, logout } from '../support/auth'
import { testAccounts } from '../support/env'
import { resetTestData } from '../support/seed'

test.describe('Auth', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('sign up as a fresh guest lands on /home with guest-only nav', async ({ page }) => {
    const email = `e2e-signup-${Date.now()}@test.eventflow.dev`
    await page.goto('/signup')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm password').fill('TestPassword123!')
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()
    await page.waitForURL('**/home')
    await expect(page.getByTestId('nav-my-tickets-link')).toBeVisible()
    await expect(page.getByTestId('nav-dashboard-link')).toHaveCount(0)
  })

  test('log in as the seeded host lands on /dashboard with host nav', async ({ page }) => {
    await loginAs(page, 'host')
    await expect(page.getByTestId('nav-dashboard-link')).toBeVisible()
    await expect(page.getByTestId('nav-my-tickets-link')).toBeVisible()
  })

  test('log out returns to /login and reverts the nav', async ({ page }) => {
    await loginAs(page, 'host')
    await logout(page)
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  test('forgot password shows the confirmation state', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill(testAccounts.host.email)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText('Check your email for a link to reset your password.')).toBeVisible()
  })
})
