# Phase 02 — Accounts, Import, Activation, and Authentication

## Read first

`AGENTS.md`, `docs/PRD.md`, `docs/BUSINESS_RULES.md`, `docs/DATABASE.md`, `docs/API_CONTRACTS.md`, `docs/DEPLOYMENT.md`. Inspect completed Phase 01 and current auth dependencies.

## Objective

Create a secure invite-only account system: admin imports names/emails; students activate by email and choose their password; sessions and roles are enforced server-side.

## Tasks

1. Implement users, token/account recovery and chosen auth-library schema/migrations with normalized unique email. Use a maintained Next.js-compatible auth approach rather than writing session cryptography from scratch.
2. Implement secure admin bootstrap via documented one-time script or environment-based command; **never expose a public admin registration route or default shared password**.
3. Admin-only CSV import UI/API (minimum). Show preview, invalid rows and duplicates, allow safe upsert rules; do not overwrite existing activated accounts casually. No public signup.
4. Activation flow via Resend: single-use expiring hashed token, link to set password, activation success/error/resend behavior. Keep email sending **outside transaction locks** and make failures visible. Provide a development-safe mode that avoids emailing unintended recipients.
5. Student login/logout, session checks, protected admin/student routes, password recovery if compatible with selected auth library, basic rate limits/validation and clear Indonesian feedback.
6. Build mobile-accessible screens with shadcn/ui Form/Input/Button/Card/Alert, etc. No manual substitute primitives.
7. Protect routes/APIs server-side; test unauthorized, token reuse/expiry, duplicate email, and wrong role cases.

## Out of scope

No package game creation, whitelist per game, war submission, realtime dashboard or hardcoded student accounts in production.

## Acceptance criteria

- Pre-imported user can activate once, set password and log in; no signup route exists.
- Unknown users cannot create accounts through public flow.
- User email is unique; tokens expire and cannot be replayed; password is hashed.
- Admin and student permissions are enforced beyond client UI.
- CSV import and Resend error handling are safe and understandable.

## Verification and delivery

Focused auth/security tests + typecheck/lint/build. Commit locally as `feat(auth): add invite-only student accounts` (or similar). **DO NOT PUSH.** Report any email provider credentials required for live end-to-end checks.
