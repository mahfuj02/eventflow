# End-to-end tests

Playwright tests that drive a real `netlify dev` instance (frontend +
functions together) against a dedicated test database and a small fixed
set of real Firebase test accounts — see the full plan for the reasoning
behind these choices.

## One-time setup

1. **Firebase**: create three real Email/Password accounts in the
   project's existing Firebase Authentication (Authentication → Users →
   Add user):
   - `e2e-guest@test.eventflow.dev`
   - `e2e-host@test.eventflow.dev`
   - `e2e-pending@test.eventflow.dev`

   After creating `e2e-host` and `e2e-pending`, copy each one's **User
   UID** from the Users list — you'll need both.

2. **Admin**: set `ADMIN_EMAIL` in your test environment to
   `e2e-host@test.eventflow.dev` so that account can also approve host
   applications in tests (same admin-email check the real app already
   uses).

3. Copy `.env.test.example` (repo root) to `.env.test` and fill in:
   - The three accounts' emails/passwords
   - `E2E_HOST_FIREBASE_UID` / `E2E_PENDING_FIREBASE_UID` from step 1
   - `E2E_FIREBASE_API_KEY` — same value as `VITE_FIREBASE_API_KEY` in
     `frontend/.env`
   - Leave `MONGODB_DB_NAME=eventflow_test` as-is — this is what keeps
     tests from ever touching real data on the same Atlas cluster

4. Install Playwright's browser binary once: `npx playwright install chromium`

## Running locally

Two terminals:
```
# Terminal 1 - serve the app with both .env and .env.test loaded
netlify dev

# Terminal 2
npm run test:e2e
```
`netlify dev` needs the test env vars active for the run (either merge
`.env.test` into your `.env` temporarily, or use `netlify dev --context test`
with test values set as a separate deploy context in Netlify's own
project settings — either approach is a Netlify Dev configuration
question, not something this suite mandates).

`npm run test:e2e:ui` opens Playwright's interactive UI mode instead,
useful while writing or debugging a test.

## What's real vs. shortcutted

- **Real**: Firebase Auth, MongoDB (a real, separate `eventflow_test`
  database), Cloudinary uploads, the actual `netlify dev` server.
- **Shortcut**: most Stripe Checkout flows confirm payment via a direct
  API call (`support/stripe.ts`) instead of driving Stripe's hosted page.
  Two tests (`guest-checkout-smoke.spec.ts`,
  `guest-account-upgrade.spec.ts`) deliberately drive the real hosted
  Checkout page with the standard `4242 4242 4242 4242` test card — if
  Stripe changes that page's structure, only `support/stripeCheckoutUi.ts`
  and those two specs should need updating.
- **Not automated at all**: Google sign-in (real OAuth popup). Manual
  test only.

## Test data lifecycle

Every spec calls `resetTestData()` in a `beforeEach`, which wipes
`events`, `tickets`, `orders`, `guests`, and `hostApplications` in the
test database (never touches the real one — `test-seed.mts` refuses to
run unless `MONGODB_DB_NAME` ends in `_test`). The three Firebase
accounts themselves are never deleted; only their MongoDB-side profile
documents get reset between tests.
