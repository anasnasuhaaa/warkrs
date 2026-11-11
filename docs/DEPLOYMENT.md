# Deployment, Environments, and Reliability

## 1. Two deployments, one codebase

### Staging — Vercel + Neon

- Deploy existing Next.js App Router application to Vercel using managed Neon PostgreSQL.
- Configure staging-only environment values, credentials and Resend testing policy.
- Use a transaction-capable PostgreSQL connection configuration for the shared allocation module. **Do not accidentally select a Neon HTTP-only query client for multi-query interactive transaction/row lock behavior.**
- Use bounded polling for realtime staging. Vercel Functions do not run indefinitely, and long-lived SSE channels are not a requirement for staging.
- Avoid a background worker that needs to stay alive on Vercel. No in-memory FCFS queue.
- Test activation with approved addresses; do not email the full cohort during development.

### Production — Docker Compose + PostgreSQL

- Compose services: `web` (Next.js Node), `db` (PostgreSQL with persistent volume and health check), optionally `proxy` (Caddy/Nginx) for HTTPS.
- Production retains the same schema/migrations and allocation engine; only infrastructure configuration changes.
- Optional SSE on the persistent web server, backed by durable events and a polling fallback.
- Ensure secure network boundaries: do not publish PostgreSQL port publicly, use HTTPS and secure cookie settings, configure domain and trusted proxy headers.
- Server may be a self-hosted laptop, but laptop power/internet is a single point of failure. Use a reliable VPS if feasible for the live war, or rehearse operational recovery carefully.

## 2. Environment variables (illustrative)

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB
DIRECT_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB
AUTH_SECRET=replace-with-long-random-secret
APP_BASE_URL=http://localhost:3000
RESEND_API_KEY=replace-with-test-key
EMAIL_FROM=War KRS <noreply@example.org>
REALTIME_MODE=polling
TZ=Asia/Jakarta
```

Use `.env.example` with **placeholders only**. For Neon, use the appropriate pooled connection where compatible with the selected transaction-capable driver and a direct connection for migrations. Verify actual driver transaction support and prepared statement/pooler compatibility before implementation. For Docker, use internal DB hostname/port, persistent data and separate secrets. Do not commit `.env.local` or credentials.

## 3. Database operations

- Use versioned Drizzle migrations, never destructive automatic schema pushes to production.
- Production backups must be created and restoration tested before the actual event.
- Separate staging and production databases; never share real imported cohort data casually with staging.
- Seed only fictional users for tests. Do not reset or truncate completed game data as a normal operation.
- Keep primary DB and application functions geographically close where possible to reduce latency.

## 4. Observability and operational readiness

- Health/status endpoint and clear startup errors.
- Structured logs for request failures, DB contention, email delivery failures, manual close and allocation invariant failures; do not log passwords or raw activation tokens.
- Metrics to examine: transaction processing latency, p95/p99 submit latency, connections, errors, quota integrity, duplicate submission count, live update lag and reconnect count.
- Graceful error messages for DB unavailability; recover already committed results on refresh.
- Configure basic rate limiting for authentication and spam protection; protect FCFS ordering and avoid unexpected rejections in valid 200-user bursts.

## 5. Verification milestones

1. Local: database migration, auth/import, join, timing, manual close and ranking tests.
2. Staging Vercel + Neon: online QA, account activation, representative simulations, database transaction behavior, reconnect behavior. Document staging limits; **passing staging tests alone is not a capacity guarantee**.
3. Production-like Docker: test with 200 simultaneous clients and a safety margin (e.g., 500), including same-package contention, duplicates, disconnects and premature close. Confirm no oversubscription or multiple allocations, then inspect latency/CPU/RAM/network.
4. Production: verify HTTPS, backups, database persistence, admin access, known time zone and incident procedure before the event.

## 6. Common pitfalls

- Assuming load balancer fixes a single laptop's power or network failure.
- Keeping an FCFS queue in memory or awarding from client-side quota.
- Assuming Vercel Function instances share state or can run forever.
- Using a database driver that does not support interactive transaction/locking semantics required by allocation.
- Using direct public DB ports or storing activation links in logs.
- Claiming polling and SSE have the same realtime characteristics.

## Official references (verify current docs during setup)

- Vercel Functions and duration: https://vercel.com/docs/functions/configuring-functions/duration
- Vercel runtime/streaming: https://vercel.com/docs/functions/runtimes
- Neon docs: https://neon.com/docs
- Drizzle transactions: https://orm.drizzle.team/docs/transactions
- shadcn/ui existing Next.js project: https://ui.shadcn.com/docs/installation/next

## Implemented foundation (Phase 01)

- Node.js 22, existing Next.js 16 App Router, npm lockfile and standalone Docker output.
- `pg` + Drizzle supports interactive transactions; lazy pool size is 5 per instance,
  with connection/statement timeouts. Neon URLs must enable SSL using `sslmode=require`;
  do not disable TLS verification. Use the direct URL for Drizzle migrations.
- `npm run db:check` is an operator-only read-only connectivity probe. `/api/health`
  is process liveness, not a claim that PostgreSQL or email delivery is ready.
- Docker uses separate dependency, tooling, build and unprivileged runtime stages.
  Compose requires explicit secrets, health-checks PostgreSQL, persists its volume,
  publishes web only on loopback and does not publish the database.
- No runtime database initialization or migrations occur during static builds.
- Phase 01 does not implement accounts, game data, email or allocations.
