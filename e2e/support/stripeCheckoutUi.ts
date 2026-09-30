import type { Page } from '@playwright/test'

// Drives Stripe's real hosted test-mode Checkout page with the standard
// 4242 test card. Every spec that needs a completed purchase uses this -
// there's no supported server-only way to mark a hosted Checkout Session
// paid (see guest-checkout.spec.ts's comment for why).
export async function payWithTestCard(page: Page, email: string): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com/)
  await page.getByLabel('Email').fill(email)
  await page.getByPlaceholder('1234 1234 1234 1234').fill('4242424242424242')
  await page.getByPlaceholder('MM / YY').fill('12/34')
  await page.getByPlaceholder('CVC').fill('123')
  await page.getByLabel('Cardholder name').fill('E2E Test')

  // Stripe's Address Element defaults the billing country from the
  // runner's IP and shows a required ZIP field for countries that need
  // one (e.g. United States - which is what a GitHub Actions runner's IP
  // resolves to, unlike most local dev machines). Fill it only if
  // present, otherwise clicking Pay silently fails client-side validation
  // and the page never redirects.
  const zip = page.getByLabel('ZIP', { exact: true })
  if (await zip.isVisible().catch(() => false)) {
    await zip.fill('10001')
  }
  const phone = page.getByLabel('Phone number', { exact: true })
  if (await phone.isVisible().catch(() => false)) {
    await phone.fill('2015550123')
  }

  await page.getByRole('button', { name: /pay/i }).click()
  await page.waitForURL(/\/orders\/success\?session_id=/, { timeout: 30_000 })
}
