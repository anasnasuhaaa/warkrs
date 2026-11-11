# AGENTS.md — War KRS Repository Instructions

## Read first

Before modifying the codebase, read `README-CODEX.md` (if present), `docs/PRD.md`, `docs/BUSINESS_RULES.md`, `docs/ARCHITECTURE.md`, and the current `prompts/*.md` phase. Consult `docs/DATABASE.md`, `docs/API_CONTRACTS.md`, and `docs/DEPLOYMENT.md` when relevant. **Business rules are authoritative.** If documentation contradicts actual requirements, report the discrepancy rather than inventing new product behavior.

## Repository and delivery constraints

- A developer has already created a bare Next.js app using `create-next-app` and connected Git/GitHub. Do **not** run `git init`, recreate the app, or overwrite its configuration blindly.
- Inspect the installed Next.js/React/TypeScript/Tailwind versions, existing package manager and lockfile. Use compatible, currently supported dependency versions; do not arbitrarily pin guessed versions.
- One codebase, **modular monolith**. Do not introduce microservices, Kubernetes, Redis, message brokers, or a dedicated Go/Rust service without measured need and explicit approval.
- Implement **only the requested phase**, preserving prior functionality.
- Run targeted typecheck, lint, tests, and build checks appropriate for that phase. Keep test scope proportional, but **never skip** critical transactional concurrency tests in Phase 05.
- After completing and verifying a phase, create **one local Conventional Commit**; choose a descriptive scope. **Never run `git push`, `git push --force`, or deploy without explicit instruction.**
- Do not amend or discard unrelated changes. Do not commit credentials, `.env*` secrets, private user data, generated credentials, or test email recipient lists.
- If incomplete, report the blocker honestly instead of creating a false completion commit.

## Stack and architecture

- Next.js App Router + TypeScript, server runtime Node.js.
- Tailwind CSS + **official shadcn/ui installed into the existing project**; use official shadcn components for Button, Card, Dialog, AlertDialog, Checkbox, Input, Table, Badge, Tabs, etc. Compose custom domain-specific views using them. Do not hand-build replacement primitives.
- PostgreSQL + Drizzle ORM + versioned SQL migrations. Support Neon for staging and Docker-hosted PostgreSQL for production.
- Secure email activation via Resend; no self-registration. Prefer a maintained session/auth library compatible with the actual environment.
- Live updates via server-side event records plus SSE where supported and a reliable polling fallback. Do not require an indefinitely-running Vercel Function.
- Avoid all core state in process memory; use database-persisted sources of truth. Serverless instances and Docker restarts must not change game outcomes.
- Use `timestamptz` and server/DB time for all authoritative timestamps. UI displays `Asia/Jakarta`.
- Avoid unnecessary packages and abstractions; prioritize clear application code.

## Business rules that must never be broken

1. Only imported/activated users may authenticate. Admin assigns a per-game whitelist.
2. Whitelisted users may manually join during Upcoming **or Live** by affirmatively accepting game terms; consent is recorded per game/version.
3. The participant can choose ranked packages **only during Live**, never before it.
4. Every available package must appear **exactly once** in the submitted ranking. No adjustable priority count.
5. Exactly **one immutable submission per participant per game** and at most one allocation per game.
6. The server/database establishes authoritative FCFS order; client timestamps, browser timers, and arrival animations do not decide winners.
7. Never oversubscribe a package; database locks/transactions and constraints protect invariants even under high concurrency.
8. Skip full packages in ranking order and allocate the first with remaining capacity. Publish failed-attempt and success events only after transaction commit.
9. Before publication, validate total package capacity >= whitelist size; published game configuration is frozen.
10. Manual End War requires admin confirmation and reason. Existing accepted submissions are preserved; new ones are closed out. Game never auto-closes just because everyone submitted.
11. Once Live, configuration is read-only; once Completed, no edit, reset, or deletion of outcomes.
12. Full participant names in winners and live activity are visible only to authorized game participants/admins and must be disclosed in join terms.

## UX and accessibility

- Application interface copy: **Bahasa Indonesia**, understandable to students and admins.
- Mobile-first, responsive for mobile/tablet/desktop; keyboard accessible and readable contrast.
- War selection is **one-tap sequential ranking**, with obvious rank numbers and easy corrections before submit. No duplicate picks and no submit until all packages are ranked.
- Visible states for upcoming/countdown, live, submitting, accepted/allocated, closing, completed, offline, reconnecting, and errors.
- Do not represent a click as a confirmed submission. Handle retry/reload without double registration.
- Avoid noisy animation, layout shifts, or confirmation modal after selecting all packages; explicit consent happens at Join Game.
- Admin tables and logs must remain usable on narrow screens.

## Security and reliability

- All authorization is enforced server-side on every endpoint/action; hiding controls is not authorization.
- Implement CSRF protections appropriate to the selected auth mechanism; rate-limit activation/login and war submission appropriately without breaking valid FCFS behavior.
- Validate request input on the server; prevent duplicate ranking, unauthorized package IDs, mismatched game IDs, time-window bypass, and log enumeration by nonparticipants.
- Store only password hashes (Argon2id or robust library default). Activation/reset tokens are single-use, expire, and are stored hashed.
- Keep event/audit logs append-only in normal application operation. Avoid exposing activation tokens or secrets in logs.
- Use deterministic test fixtures and fail-closed database checks. Do not use in-memory locks, timestamps, or purely client-side checks to enforce quota.

## Documentation and final reporting

When a phase finishes, summarize: implemented scope, key files, verification and results, commit hash, and known limitations. Update documentation if implementation details differ while preserving approved business rules. Do not state a Vercel or Docker deployment succeeded unless it was actually performed and verified.
