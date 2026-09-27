# EventFlow — Project Plan

## Purpose
A scoped clone of 3Common's event-ticketing platform (ticketing + CRM slice),
built to gain real hands-on experience with MongoDB, Firebase, Vue 3, and
serverless functions — closing gaps in a job application.

## Stack
- Frontend: Vue 3 (Composition API) + TypeScript — /frontend
- Backend: Netlify Functions (TypeScript) — /netlify/functions
- Database: MongoDB (events, tickets, orders) + Firebase (Auth, real-time guest updates)
- Payments: Stripe (test mode only)

## Core Features (in build order — one complete vertical slice at a time)
1. Data models: Event, Ticket, Guest/CRM, Order
2. Auth: Firebase login/signup
3. Slice 1 — Create Event: API function → Vue form → saved in MongoDB
4. Slice 2 — Browse Events + Buy Ticket: Stripe test-mode checkout
5. Slice 3 — Guest/CRM View: purchase history pulled per guest
6. Slice 4 — Host Dashboard: read-only view of sales + guest list per event,
   plus one chart (tickets sold + revenue over time)

## UI scope (locked — do not add beyond this list without a new decision)

**Public Home (logged out)**
- Hero with search, event grid
- Event cards use a neutral icon placeholder for now (swap for real photos
  via `Event.imageUrl` once real images exist — no upload flow yet)
- Nav: Browse Events only, plus Sign in / Sign up

**Guest Home (logged in)**
- Nav: Home + My Tickets only — no Favorites, Profile, or Settings pages
- Sections: "Your tickets" (purchase history) + "More events for you" (browse)
- If the guest checked out without an account, show a small banner offering
  to create one — never a blocking wall (note: guest checkout without an
  account isn't built yet — buying currently requires login; this banner
  scope depends on that being added first)

**Host Dashboard (logged in)**
- Nav: Dashboard + Events + Orders + Guests only — no Marketing, Analytics,
  or "Quick Actions" panel, no upsell banners
- Summary cards: Total Tickets Sold, Total Revenue, Active Events
- One simple chart: tickets sold + revenue over time (line or bar), nothing
  fancier
- "Your Events" table + a "Recent Activity" feed

## Design reference
Mockups for the four core views are in `design/` (public-home.png, guest-home.png,
host-dashboard.png, host-apply.png). Match their layout, spacing, and content —
do not copy any markup, this is a visual reference only.

Design tokens:
- Background: #F7F5F0 (ivory)
- Text primary: #1C1B19 · Text secondary: #6B6A65
- Accent (teal): #0F6E56 / #085041 (hover)
- Headings: Fraunces (serif) · Body: system sans-serif
- Cards: white bg, 1px border #E5E2D9, 12–16px radius
- Buttons: filled teal (.btn-fill) for primary actions, ghost/outline for secondary
## Development approach
- One vertical slice fully working before starting the next
- Use Plan Mode for each slice before Claude edits any files
- Sonnet as default model; switch to Opus only for genuinely hard bugs
  or the Stripe payment logic specifically
- Follow all rules in CLAUDE.md (git workflow, env vars, code style)