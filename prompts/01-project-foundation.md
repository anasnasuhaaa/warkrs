# Phase 01 — Existing Project Foundation

## Read first

Read `AGENTS.md`, `docs/PRD.md`, `docs/BUSINESS_RULES.md`, `docs/ARCHITECTURE.md`, and `docs/DEPLOYMENT.md`. Inspect the current repository before edits.

## Objective

Turn the **already created bare `create-next-app` repository** into the maintainable foundation for the War KRS modular monolith, without building unrelated features or recreating the project.

## Tasks

1. Detect the existing package manager, versioned lockfile, Next.js/React/Tailwind setup, App Router layout and whether `src/` exists. Preserve and adapt conventions.
2. Initialize **shadcn/ui inside the existing application** via the official supported setup and add only components needed for the starter layout (for example Button, Card, Badge, Tabs, Dialog, Checkbox, Input, Table). Do not manually reimplement shadcn primitive components.
3. Create a coherent app-wide layout/typography/color/token baseline, navigation shells for student/admin, mobile-first responsiveness and Indonesian placeholder copy. Avoid fake production results; label fixtures clearly.
4. Add a modular folder structure (`db`, `lib`, `modules`, `components/domain`) consistent with the repository. No empty architecture ceremony; prefer lean files with clear responsibilities.
5. Add Drizzle ORM + a **transaction-capable PostgreSQL driver** compatible with both Neon/Node Vercel and Docker/Postgres. Provide schema/migration tooling and a tiny safe connectivity check. Keep connection setup Node-safe; do not initialize DB during static build unless necessary.
6. Add safe `.env.example` (placeholders only), `.gitignore` checks, minimal app config validation and useful `package.json` scripts (`typecheck`, `lint`, `build`, `db:generate`, `db:migrate`, as compatible).
7. Add a multi-stage production-oriented `Dockerfile` and initial `compose.yaml` with web + Postgres persistent volume, proper health checks, no exposed public database port by default. Make deployment documentation accurate; avoid assuming secrets are available.
8. Ensure the Vercel build pathway is compatible with the same Next.js app. Do not depend on persistent background jobs, WebSocket servers, or in-memory cross-request state.

## Out of scope

No completed auth, game management, live FCFS, full schema, realtime implementation, mail sending, external deploy, Git push or full-load tests in Phase 01.

## Acceptance criteria

- The existing Next.js app remains runnable, lint/typecheck/build pass using available environment or a documented safe setup.
- shadcn/ui components render in a coherent responsive application shell.
- Drizzle transaction-capable database setup and migrations are ready; no secrets committed.
- Docker and Vercel pathways are documented/configured without claiming deployment success.

## Delivery instructions

Perform focused checks, summarize changes and caveats, create **one local commit** such as `feat: establish war krs project foundation`, and **DO NOT PUSH**. Respect unrelated working tree changes.
