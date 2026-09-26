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
6. Slice 4 — Host Dashboard: read-only view of sales + guest list per event

## Development approach
- One vertical slice fully working before starting the next
- Use Plan Mode for each slice before Claude edits any files
- Sonnet as default model; switch to Opus only for genuinely hard bugs
  or the Stripe payment logic specifically
- Follow all rules in CLAUDE.md (git workflow, env vars, code style)