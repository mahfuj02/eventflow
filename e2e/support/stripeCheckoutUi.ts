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

  // Stripe Link's "Save my information for faster checkout" is checked by
  // default. If a phone number gets filled in while it's on, Link tries to
  // verify it via an SMS one-time code - a modal that blocks every future
  // click forever, since there's no real phone to receive the code. Turn
  // Link off instead of filling the phone field at all; it was never a
  // required field, only ZIP was.
  const saveInfo = page.getByRole('checkbox', { name: 'Save my information for faster checkout' })
  if (await saveInfo.isVisible().catch(() => false)) {
    await saveInfo.uncheck()
  }

  await page.getByRole('button', { name: /pay/i }).click()

  // Stripe Link can still force a "Confirm it's you" one-time-code step
  // after clicking Pay if it recognizes the email from a previous run
  // (server-side, independent of the "save my information" checkbox on
  // THIS attempt) - a defensive backstop alongside using a unique email
  // per run. Test mode never actually sends a code and always accepts
  // 000000, per the dialog's own on-screen instructions.
  const linkVerification = page.getByText("Confirm it's you")
  if (await linkVerification.isVisible({ timeout: 5_000 }).catch(() => false)) {
    for (let i = 1; i <= 6; i++) {
      await page.getByLabel(`Security code character ${i}`).fill('0')
    }
  }

  await page.waitForURL(/\/orders\/success\?session_id=/, { timeout: 30_000 })
}
