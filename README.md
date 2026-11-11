# War KRS

Aplikasi kesepakatan paket KRS angkatan, **bukan portal KRS resmi kampus**.
Next.js App Router modular monolith, PostgreSQL/Drizzle, Better Auth, Resend,
official shadcn/ui. UI in Bahasa Indonesia; authoritative time/order lives in the DB.

Implemented through Phase 08: invite-only account import/activation/recovery,
Draft games/packages/whitelists, frozen publication, affirmative join during
Upcoming/Live, all-package sequential ranking, one immutable transactional FCFS
allocation, admin End War, authorized named winners/events, polling and optional
bounded Docker SSE, responsive interfaces and reproducible verification.

## Local setup

Requires Node.js 22, npm (`package-lock.json`), PostgreSQL 17.

```sh
npm ci
cp .env.example .env.local
# Replace placeholders, use a separate development DB; EMAIL_MODE=disabled.
npm run db:migrate
npm run db:check
npm run dev
```

Use secure environment injection for `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL`, and
`BOOTSTRAP_PASSWORD` (>=16 characters), then `npm run admin:bootstrap` once.
It refuses an existing admin. Clear bootstrap variables immediately. There is no
public signup or default account. Import `name,email` CSV at `/admin/students`,
review rows, then explicitly send activation when Resend testing is configured.

`.env.local` is loaded by Next.js and operator scripts; shell environment values
have precedence. The example contains placeholders only. Do not commit secrets,
recipient lists, backups or generated test artifacts.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
# Build needs no DB/auth/email credentials; npm start serves standalone output.
```

For database-backed tests, explicitly provide `DATABASE_URL` ending in `_test`, a
>=32-character test `AUTH_SECRET`, and `EMAIL_MODE=disabled`. Migrate that DB first.
`npm test` runs real PostgreSQL transaction/security tests, including 200/500-client
bursts. It never resets historical results.

```sh
npx playwright install chromium
npm run test:browser:fixtures
npm run test:browser
```

Browser checks use the test DB, start the production server on port 3100, and cover
320/375/768/1024/1440px, axe accessibility, consent/ranking/results/admin and reconnect.
Regenerate fixtures before each full browser run. Private generated fixtures,
traces and screenshots stay in ignored directories.

## Docker and staging

Create an ignored `.env` from the example with actual URL-safe secrets.

```sh
docker compose --profile tools build web tooling
docker compose up -d db
docker compose run --rm tooling
docker compose up -d web
```

The tooling profile explicitly applies reviewed migrations. Web is non-root,
loopback port 3000; PostgreSQL has a persistent volume and no host port. Never run
`down -v` against event data. Put HTTPS/reverse proxy in front of the web service.
`/api/health` is process liveness; `/api/ready` checks DB connectivity.

Vercel uses the same app and `npm run build`, with Neon pooled `DATABASE_URL`,
direct migration URL, exact HTTPS `APP_BASE_URL`, secret and Resend configuration.
Default realtime is polling; no worker or perpetual Vercel stream is required.

The interface uses Poppins through `next/font/google`, a semantic blue theme and
an official shadcn sidebar for administrators. Initial font builds require access
to Google Fonts; browsers receive self-hosted assets. Date/time fields display WIB
and retain the existing UTC API contract.

Internal implementation instructions, prompts and operational documents remain
local in `AGENTS.md`, `README-CODEX.md`, `docs/` and `prompts/`; these paths are
intentionally excluded from Git. Application source, migrations, Docker setup and
test/load scripts remain versioned. No Git push or external deployment is performed
by these scripts.
