import type { APIRequestContext, Page } from '@playwright/test'
import { firebaseApiKey, testAccounts } from './env'

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

// Same signInAnonymously() the app itself uses, called directly via
// Firebase's REST API so API-shortcut tests can authenticate without a
// browser at all.
export async function signUpAnonymously(request: APIRequestContext): Promise<{ idToken: string; localId: string }> {
  const response = await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey()}`,
    { data: { returnSecureToken: true } },
  )
  if (!response.ok()) {
    throw new Error(`Anonymous sign-up failed: ${response.status()} ${await response.text()}`)
  }
  return (await response.json()) as { idToken: string; localId: string }
}

export async function loginAs(page: Page, role: TestRole): Promise<void> {
  const account = testAccounts[role]
  await page.goto('/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password())
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL(role === 'host' ? '**/dashboard' : '**/home')
}

export async function logout(page: Page): Promise<void> {
  await page.getByTestId('nav-avatar-button').click()
  await page.getByTestId('nav-logout-button').click()
  await page.waitForURL('**/login')
}
