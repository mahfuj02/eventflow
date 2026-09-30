import { test, expect } from '@playwright/test'
import { getIdToken, login, loginAs } from '../support/auth'
import { testAccounts } from '../support/env'
import { resetTestData, seedGuest, seedHostApplication } from '../support/seed'

test.describe('Host onboarding', () => {
  test.beforeEach(async ({ request }) => {
    await resetTestData(request)
  })

  test('a pending applicant sees the pending message, not the form', async ({ page, request }) => {
    await seedHostApplication(request, { userId: testAccounts.pending.firebaseUid(), status: 'pending' })
    await loginAs(page, 'pending')
    await page.goto('/apply-to-host')
    await expect(page.getByTestId('host-application-pending')).toBeVisible()
    await expect(page.getByTestId('host-application-form')).toHaveCount(0)
  })

  test('a fresh guest can submit an application and see it pending immediately', async ({ page }) => {
    const email = `e2e-apply-${Date.now()}@test.eventflow.dev`
    await page.goto('/signup')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!')
    await page.getByLabel('Confirm password').fill('TestPassword123!')
    await page.getByRole('button', { name: 'Sign up' }).click()
    await page.waitForURL('**/home')

    await page.goto('/apply-to-host')
    await page.getByLabel('Organization or business name').fill('E2E Test Org')
    await page.getByLabel('Contact name').fill('E2E Tester')
    await page.getByLabel('Role / title').fill('Organizer')
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Phone number').fill('2045550123')
    await page.getByLabel('Tell us about your event(s)').fill('Testing the application flow end to end.')
    await page.getByLabel(/I confirm the information/).check()
    await page.getByRole('button', { name: 'Submit application' }).click()

    await expect(page.getByTestId('host-application-pending')).toBeVisible()
  })

  test('approving via the real admin endpoint flips the application and shows the congrats modal once', async ({
    page,
    request,
  }) => {
    // A guest doc must already exist for the approval's role update to take
    // effect (approveHostApplication does a plain updateOne, no upsert) -
    // in real usage this always exists by the time someone reaches this
    // flow, since reaching any authenticated page already triggers sync-guest.
    await seedGuest(request, {
      firebaseUid: testAccounts.pending.firebaseUid(),
      email: testAccounts.pending.email,
      name: 'E2E Pending',
      role: 'guest',
    })
    // Requires ADMIN_EMAIL (test env) to equal E2E_HOST_EMAIL - see e2e/README.md
    const { _id: applicationId } = await seedHostApplication(request, {
      userId: testAccounts.pending.firebaseUid(),
      status: 'pending',
    })
    const adminToken = await getIdToken(request, 'host')
    const approveResponse = await request.post('/.netlify/functions/approve-host-application', {
      data: { applicationId },
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(approveResponse.ok()).toBeTruthy()

    // Not loginAs('pending') - that helper assumes a non-host account
    // still redirects to /home, but this account has just been approved
    // to host and now redirects to /dashboard instead.
    await login(page, testAccounts.pending.email, testAccounts.pending.password())
    await page.waitForURL('**/dashboard')
    await page.goto('/apply-to-host')
    await expect(page.getByTestId('host-application-approved')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible()

    await page.goto('/dashboard')
    await expect(page.getByTestId('approval-congrats-modal')).toBeVisible()
    await page.getByRole('button', { name: "Let's go" }).click()
    await page.reload()
    await expect(page.getByTestId('approval-congrats-modal')).toHaveCount(0)
  })
})
