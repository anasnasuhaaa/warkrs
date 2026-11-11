# War KRS

Aplikasi kesepakatan paket KRS angkatan, bukan portal KRS resmi kampus.

## Local development

Requires Node.js 22, npm (use `package-lock.json`), and PostgreSQL 17.

```sh
npm ci
cp .env.example .env.local
# Replace placeholders; never commit credentials.
npm run dev
```

Use `npm run typecheck`, `npm run lint`, and `npm run build` for focused checks.
The build needs no database or email secrets. `npm run db:check` performs a read-only
`SELECT 1`. `npm run db:generate` creates reviewed SQL migrations and
`npm run db:migrate` applies them using `DIRECT_DATABASE_URL` (falls back to
`DATABASE_URL`). Domain schema begins in Phase 02; Phase 01 creates no dummy tables.

## Architecture

The existing root `app/` App Router and npm conventions are preserved.
`components/ui` contains official shadcn primitives, `components/domain` composes
application views, `modules` holds business use cases, `lib` configuration/helpers,
and `db` PostgreSQL/Drizzle setup. Never keep authoritative game state in memory.

## Hosting

See [deployment instructions](docs/DEPLOYMENT.md). Build with `npm run build` on
Vercel; use a Neon pooled PostgreSQL URL for application transactions and a direct
URL for migrations. Polling requires no perpetual function.

For Docker, create an ignored `.env` from the example and replace every placeholder.
Use URL-safe database credentials (or percent-encode the password in database URLs).
Run `docker compose up --build -d`; the web port binds to loopback for a reverse
proxy and PostgreSQL has no published port. The named volume preserves data.
Do not run `docker compose down -v` against event data. Run migrations as an
explicit operator step, never automatically during builds. HTTPS, live provider
credentials and external deployment are separate operator responsibilities.
