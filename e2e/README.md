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
# Terminal 1 - serves the app with .env.test AND .env merged
# (.env.test is loaded first, so ITS values win on overlap - e.g.
# MONGODB_DB_NAME/ADMIN_EMAIL - dotenv-cli gives priority to whichever
# -e file is listed first, not the last)
npm run dev:e2e

# Terminal 2
npm run test:e2e
```
`npm run dev:e2e` runs `netlify dev` through `dotenv-cli` so both files
load together — `netlify dev` alone only ever reads `.env`, never
`.env.test`, so plain `netlify dev` will run against your real database
instead. Use `npm run dev:e2e` specifically whenever you intend to run
the e2e suite; use plain `netlify dev` for normal app development.

`npm run test:e2e` is *also* wrapped in `dotenv-cli` the same way — the
Playwright process itself (not just the app under test) needs
`.env.test`'s `E2E_*` values directly, since `support/env.ts` and
`support/auth.ts` read them via `process.env` to log in and seed data,
Plain `npx playwright test` (without the npm script) won't have these set.

`npm run test:e2e:ui` opens Playwright's interactive UI mode instead,
useful while writing or debugging a test.

## What's real vs. shortcutted

- **Real**: Firebase Auth, MongoDB (a real, separate `eventflow_test`
  database), Cloudinary uploads, the actual `netlify dev` server.
- **No API shortcut for Stripe payment**: originally planned (create a
  Checkout Session via API, then confirm its PaymentIntent directly with
  no browser), but Stripe doesn't create a Checkout Session's
  PaymentIntent until a real client confirms the session (API version
  2022-08-01+) — there's no supported server-only way to mark a hosted
  Checkout Session paid. Every test needing a completed purchase
  (`guest-checkout.spec.ts`, `guest-checkout-smoke.spec.ts`,
  `guest-account-upgrade.spec.ts`) drives the real hosted Checkout page
  with the standard `4242 4242 4242 4242` test card via
  `support/stripeCheckoutUi.ts`. If Stripe changes that page's structure,
  only that file and those three specs should need updating.
- **Not automated at all**: Google sign-in (real OAuth popup). Manual
  test only.

## Test data lifecycle

Every spec calls `resetTestData()` in a `beforeEach`, which wipes
`events`, `tickets`, `orders`, `guests`, and `hostApplications` in the
test database (never touches the real one — `test-seed.mts` refuses to
run unless `MONGODB_DB_NAME` ends in `_test`). The three Firebase
accounts themselves are never deleted; only their MongoDB-side profile
documents get reset between tests.
