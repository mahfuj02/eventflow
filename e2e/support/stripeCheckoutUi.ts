import type { Page } from '@playwright/test'

// Drives Stripe's real hosted test-mode Checkout page with the standard
// 4242 test card. Only used by the small number of true smoke tests -
// everything else uses the API shortcut in support/stripe.ts.
export async function payWithTestCard(page: Page, email: string): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com/)
  await page.getByLabel('Email').fill(email)
  await page.getByPlaceholder('1234 1234 1234 1234').fill('4242424242424242')
  await page.getByPlaceholder('MM / YY').fill('12/34')
  await page.getByPlaceholder('CVC').fill('123')
  await page.getByLabel('Cardholder name').fill('E2E Test')
  await page.getByRole('button', { name: /pay/i }).click()
  await page.waitForURL(/\/orders\/success\?session_id=/, { timeout: 30_000 })
}
