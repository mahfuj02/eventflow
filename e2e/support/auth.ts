import type { APIRequestContext, Page } from '@playwright/test'
import { firebaseApiKey, testAccounts } from './env'
import { seedGuest } from './seed'

export type TestRole = 'guest' | 'host' | 'pending'

// Signs in via Firebase Auth's own REST API (no app UI involved) to get a
// real ID token for making direct, authenticated API calls to Netlify
// Functions from tests - e.g. asserting a 400 straight from
// create-checkout-session without needing to drive the browser through it.
export async function getIdToken(request: APIRequestContext, role: TestRole): Promise<string> {
  const account = testAccounts[role]
  const response = await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey()}`,
    { data: { email: account.email, password: account.password(), returnSecureToken: true } },
  )
  if (!response.ok()) {
    throw new Error(`Firebase sign-in failed: ${response.status()} ${await response.text()}`)
  }
  const body = (await response.json()) as { idToken: string }
  return body.idToken
}

// resetTestData() wipes the guests collection before every test, which
// also wipes the seeded host account's role: 'host' - re-seed it here so
// every test calling loginAs(page, 'host') can rely on actually landing
// on /dashboard, without every spec file needing to remember to do this
// itself. 'pending' is deliberately NOT auto-seeded here: different
// tests need it in different states (fresh guest vs. just-approved
// host), so that stays each test's own explicit responsibility.
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  if (role === 'host') {
    const hostAccount = testAccounts[role]
    await seedGuest(page.request, {
      firebaseUid: hostAccount.firebaseUid(),
      email: hostAccount.email,
      name: 'E2E Host',
      role: 'host',
    })
  }
  const account = testAccounts[role]
  await login(page, account.email, account.password())
  await page.waitForURL(role === 'host' ? '**/dashboard' : '**/home')
}

// Lower-level login with no assumption about where it redirects to -
// for the rare case where a test's account has been put in a state
// loginAs()'s hardcoded redirect expectation doesn't match (e.g. the
// 'pending' account after it's just been approved to host).
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

export async function logout(page: Page): Promise<void> {
  await page.getByTestId('nav-avatar-button').click()
  await page.getByTestId('nav-logout-button').click()
  await page.waitForURL('**/login')
}
