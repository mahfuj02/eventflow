# EventFlow

A scoped clone of a 3Common-style event-ticketing platform — browse events,
buy tickets through Stripe, and manage events from a host dashboard. Built
as a portfolio project to get hands-on with a full serverless stack: Vue 3,
Netlify Functions, MongoDB, Firebase Auth, and Stripe.

## Stack

- **Frontend**: Vue 3 (Composition API) + TypeScript + Tailwind CSS — `/frontend`
- **Backend**: Netlify Functions (TypeScript) — `/netlify/functions`
- **Database**: MongoDB (events, tickets, orders, guests, host applications)
- **Auth**: Firebase Authentication (email/password, Google, and anonymous
  guest checkout that can later be upgraded to a full account)
- **Payments**: Stripe Checkout (test mode)
- **File uploads**: Cloudinary (event banner images)
- **Email**: Resend (host application notifications and approvals)

## Features

- Public event browsing with search, and an event detail page supporting
  multiple ticket types and multi-quantity checkout in one Stripe session
- Guest checkout with no account required (Firebase Anonymous Auth), with
  an option to upgrade to a full account afterward without losing purchase
  history
- A guest's own ticket history and purchase status
- Host onboarding: an application form, email notification to the admin
  with a one-click approval link, and an approval email back to the
  applicant
- A host dashboard with revenue/ticket summary cards, a 6-month revenue
  chart, an events table, and a recent-activity feed
- Full event management for hosts: create, edit, and delete events
  (with guardrails once tickets have sold), including an optional banner
  image upload
- Per-event guest lists for hosts

## Project structure

```
frontend/             Vue 3 + TypeScript SPA
netlify/functions/     One Netlify Function per endpoint (flat, no framework)
  _lib/                Shared helpers (Mongo, Stripe, Cloudinary, Resend, auth)
shared/types/          TypeScript types shared between frontend and functions
design/                Mockups used as visual reference during development
```

## Running locally

Requires Node.js, the [Netlify CLI](https://docs.netlify.com/cli/get-started/)
(`npm install -g netlify-cli`), a MongoDB Atlas cluster, a Firebase project
(Authentication enabled), a Stripe test-mode account, a free Cloudinary
account, and a free Resend account.

1. Install dependencies:
   ```
   npm install
   npm install --prefix frontend
   ```
2. Copy `.env.example` to `.env` and `frontend/.env.example` to
   `frontend/.env`, then fill in real values.
3. Start the dev server (serves the frontend and functions together on one
   port):
   ```
   netlify dev
   ```

## Deployment

Deploys to Netlify directly from this repo — `netlify.toml` already
configures the build command, publish directory, and functions folder.
Set the environment variables from both `.env` files in Netlify's site
settings before the first deploy.
