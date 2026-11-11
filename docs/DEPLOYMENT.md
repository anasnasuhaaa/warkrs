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

## Invite-only authentication (Phase 02)

- Better Auth manages PostgreSQL-backed sessions and scrypt password hashing.
  Public routing allows only email sign-in, session read and sign-out; signup,
  email changes, provider linking and other generic account endpoints are closed.
- Import `name,email` CSV through `/admin/students`, review invalid/duplicate rows,
  and explicitly import valid rows. Existing accounts are never overwritten.
- Bootstrap once after migrations using `npm run admin:bootstrap`. Supply
  `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD` through a secure shell
  environment (password >=16 characters). The command refuses an existing admin
  and never prints credentials. Clear the bootstrap variables afterward.
- Set `AUTH_SECRET` to >=32 random characters and `APP_BASE_URL` to the exact
  origin. Custom mutations require matching Origin; Better Auth additionally
  validates origins and manages HttpOnly session cookies. Use HTTPS in production.
- `EMAIL_MODE=disabled` is the safe default. To explicitly send activation/reset
  mail, set `EMAIL_MODE=resend`, a test/staging Resend key, and verified `EMAIL_FROM`.
  Never use real cohort recipients during tests. No activation links appear in
  API responses or logs; link tokens are in URL fragments and removed on opening.
- Tokens are SHA-256 digests in the database, expire after one hour, and are consumed
  transactionally with credential replacement. Resends invalidate older tokens;
  password reset revokes sessions. Password hashing happens outside row locks.
- Rate limiting is database-persisted: login per normalized account, token use,
  activation sends and recovery. Proxy IP limits are only supplemental; deploy
  behind a trusted proxy and reject direct public access to the Node server.
- Component caching was disabled for request-specific authenticated pages; no
  auth or game response is shared through a cross-user cache. The existing
  Turbopack/Tailwind and agent-feedback settings remain intact.

### Database-backed tests

Tests require an explicitly supplied PostgreSQL database whose name ends `_test`.
Migrate it first, then run `DATABASE_URL=... AUTH_SECRET=... EMAIL_MODE=disabled npm test`.
Only fictional `example.invalid` accounts are created. Never point tests at event
or staging data. Tests use the same driver and business modules as the server.

## Realtime transport (Phase 06)

Default `REALTIME_MODE=polling` uses authorized repeatable-read snapshots and
cursor-paginated events every 4 seconds while active, exponential backoff up to
30 seconds on failures, pause in hidden tabs and immediate online/visibility
resynchronization. Completed games stop regular polling after history catches up.
Cursor advances only after a full page batch is retained; event IDs deduplicate.

Docker can opt into `REALTIME_MODE=sse` (override the Compose environment setting).
The authenticated stream polls persisted events, releases DB connections between
queries, sends heartbeat comments, supports replay IDs, and closes after 25 seconds.
The client treats SSE as an update hint; canonical snapshots/feed and polling remain
active as recovery. SSE is disabled when `VERCEL` is set. Do not enable indefinite
streams on Vercel. A proxy must disable buffering for the stream.

Joined participants and admins can read full winner names and events. Whitelisted
but unjoined students can read only their published game details/terms, with no
winner names or activity. Feed/snapshot responses omit all emails and credentials.

A 500-request stress rerun while building exposed pool acquisition timeouts at the
original 5-second setting. The pool now allows 15 seconds to acquire/connect and
submission handlers declare a 30-second function budget. Statement timeout remains
10 seconds per statement. Retune only from measurements, keep per-game lock work
short, and verify instance count/Neon connection limits before a real event.

## Browser verification

Install Chromium with `npx playwright install chromium`. After a production build,
run `npm run test:browser:fixtures` against the isolated `_test` database, then
`npm run test:browser` with the same `DATABASE_URL` and a test `AUTH_SECRET`.
The runner starts the app on port 3100 with its own exact origin and tests optional
SSE. Fixture accounts use `example.invalid`; generated passwords, tokens, cookies,
traces and screenshots live only in ignored `.test-artifacts`/`test-results`.
Do not commit or share those directories. Recreate fixtures before each full run;
immutable accepted games are never reset for testing.

## Production build and explicit operations (Phase 08)

`npm run build` also copies static/public assets into `.next/standalone`.
`npm start` runs its Node server; set `PORT` and `HOSTNAME` as needed. This removes
reliance on `next start` for standalone output. The Docker runner is non-root and
health-checks `/api/ready`; `/api/health` remains liveness. Readiness is connectivity,
not an audit of schema/data invariants; apply migrations before opening the app.

```sh
docker compose --profile tools build web tooling
docker compose up -d db
docker compose run --rm tooling
docker compose up -d web
docker compose ps
```

The profiled tooling image holds migration/CLI dependencies; they are not needed
in the traced runtime image. `scripts/migrate.ts` uses the same versioned Drizzle
SQL/journal and exits nonzero with a safe message on failure. It never pushes a
schema or resets data. For bootstrap, securely export the three BOOTSTRAP variables
and pass them using `docker compose run --rm -e BOOTSTRAP_NAME -e BOOTSTRAP_EMAIL
-e BOOTSTRAP_PASSWORD tooling npm run admin:bootstrap`; clear them afterward.

### Backup and isolated restore rehearsal

Store backups outside Git with restricted permissions/encryption and off-host
retention. These commands assume the configured default Compose project; use the
same project/env-file arguments consistently. Do not print dump contents.

```sh
umask 077
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > /secure/path/war-krs.dump
# New isolated DB only; never overwrite the event database.
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" war_krs_restore_test'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d war_krs_restore_test --no-owner --exit-on-error' < /secure/path/war-krs.dump
```

Verify tables/migration journal, account/session data, submitted rankings,
allocation counts/counters and append-only triggers on the isolated restore. Take
another restricted backup after completion. Restart with `docker compose restart`;
volumes persist. `docker compose down` also preserves named volumes. **Do not use
`down -v` or destructive seeds against event data.**

Use `ops/Caddyfile.example` as a host-level reverse-proxy example, set the actual
hostname/DNS and verify issued HTTPS. The web port stays loopback-only; PostgreSQL
has no host mapping. Use a separate migration owner/runtime DB role in hardened
production, retain trigger enforcement and prevent runtime schema changes. Never
expose the tooling profile as a public service.

### Vercel + Neon staging checklist

Use Node 22 and the committed npm lockfile; build command `npm run build`. Configure
staging-only exact HTTPS `APP_BASE_URL`, random `AUTH_SECRET`, pooled PostgreSQL
`DATABASE_URL` with TLS, direct `DIRECT_DATABASE_URL` for an explicit operator
migration step, test Resend settings and `REALTIME_MODE=polling`. Do not use the
Neon HTTP client for allocation. The selected `pg` driver uses one connection for
BEGIN/row lock/queries/COMMIT, compatible with transaction pooling; queries do not
use named prepared statements or session-scoped game state. Keep DB/functions
nearby and measure cold starts/pool contention with your actual Neon service.

Vercel's `VERCEL` environment disables the SSE route. No background job/daemon is
needed for opening, deadline enforcement, admission/allocation or recovery. Verify
actual staging function duration and connection limits before a real rehearsal.
External account connection/deployment, live email and production HTTPS require
operator configuration and have not been performed by this implementation.

### Dependency audit caveat

No high/critical npm advisories were reported in the local audit. Moderate/low
transitive advisories remain in CLI/development tooling (including Drizzle's legacy
esbuild helper and shadcn registry tooling). The shadcn CLI is a dev dependency;
compiled UI primitives/CSS run without its CLI. Do not start public development or
Drizzle Studio servers in production. Do not apply npm's suggested forced downgrade
of Drizzle/shadcn or override transitive majors without validation.

The inherited ESLint 9 is EOL. The installed official Next config's React plugin
currently declares ESLint support through 9, so 9.39.5 is retained rather than
committing an unsupported peer tree; track the compatible upstream upgrade. This
is a known toolchain maintenance limitation, not a statement of zero dependencies
with advisories. Re-audit and rebuild before an external production release.

References checked during implementation: [ESLint support policy](https://eslint.org/version-support/),
[Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting),
[Neon pooling](https://neon.com/docs/connect/connection-pooling),
[Better Auth sessions](https://better-auth.com/docs/concepts/session-management),
[Drizzle transactions](https://orm.drizzle.team/docs/transactions).
