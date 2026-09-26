# EventFlow — Project Guidelines

## Stack
- Frontend: Vue 3 (Composition API) + TypeScript, in /frontend
- Backend: Netlify Functions (TypeScript), in /netlify/functions
- Database: MongoDB (events, tickets, orders) + Firebase (Auth, real-time guest updates)
- Payments: Stripe (test mode only — never live keys in this project)

## Git workflow
- Never commit directly to main; create a feature branch per feature (e.g. feat/ticket-checkout)
- Commit messages: Conventional Commits (feat:, fix:, chore:, refactor:)
- Ask before running git push or opening a PR

## Environment variables
- Never hardcode API keys, DB URIs, or Stripe keys — always use .env
- Confirm .env is in .gitignore before first commit
- When adding a new env var, also add a placeholder to .env.example

## Code style
- TypeScript strict mode, avoid `any`
- Match existing folder structure — ask before introducing a new pattern
- Run lint/typecheck before marking a task done

## Before finishing any task
- Confirm build/typecheck passes
- No leftover console.logs or unused imports
- Briefly summarize what changed and why