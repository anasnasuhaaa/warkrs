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
public signup or default account. At `/admin/students`, add students manually or
download and upload the `.xlsx` template (`no`, `nama`, `nim`, `email`). NIM is
text, normalized to uppercase; leading zeros are preserved. Email is trimmed and
lowercased without a domain whitelist. Import supports at most 1,000 rows / 2 MB,
reports per-row errors and skips existing records without overwriting them. New
accounts remain inactive; activation emails are a separate admin action.

Apply the additive `0007_student_nim` migration with `npm run db:migrate` before
running this version. Legacy students retain a nullable NIM, shown as “Belum diisi”
until corrected. Changing email revokes sessions, credentials and old links and
requires activation at the new address. Deletion is blocked for students referenced
by a War; historical outcomes and audit records are retained. Internal `/games`
routes, tables and event names are unchanged; the interface calls them “War”.

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

> =32-character test `AUTH_SECRET`, and `EMAIL_MODE=disabled`. Migrate that DB first.
> `npm test` runs real PostgreSQL transaction/security tests, including 200/500-client
> bursts. It never resets historical results.

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

Panduan Neon + Vercel dalam Bahasa Indonesia: [PANDUAN-NEON-VERCEL.md](PANDUAN-NEON-VERCEL.md).
File lokal `.env.neon` dapat diisi untuk impor environment Vercel dan tetap diabaikan Git.

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

Account onboarding uses branded HTML and plain-text Resend email (one-hour,
 single-use fragment tokens). New passwords require 8–128 characters; activation
and reset return to login without creating a session. Public navigation validates
both the Better Auth session and active account before linking to the role's
 dashboard. Cookies still come from the existing same-origin auth route; production
requires the exact HTTPS `APP_BASE_URL`. A global shadcn Sonner toaster persists
across routes (top-right, 2 seconds).

Admin forms share client-safe Zod contracts, retain server validation, and expose
field errors through accessible descriptions. Incomplete drafts may be saved;
publication still requires complete terms, packages, capacity and whitelist.
Student actions are available through a keyboard-accessible row menu. Sonner
feedback is emitted by confirmed user actions, never by realtime refreshes.

Winners and activity use shared `Asia/Jakarta` millisecond formatting. Winner
receipt times come from `war_submissions.accepted_at`, sorted by FCFS sequence.
New draft saves/publications use an immutable `nim-v2:` terms-version prefix,
which explicitly discloses NIM visibility. Published older versions are unchanged:
public winner responses mask NIM unless the recipient consented to that War's
current `nim-v2:` version. This applies to admin winner views too; authenticated
admin result exports are a separate administrative capability.

War visibility and deletion are separate from lifecycle. Hidden published Wars
remain authorized at direct URLs, including a joined participant's Live submission
path; only student discovery excludes them. Visibility changes are audited.

Migrations `0008_war_visibility.sql` and `0009_controlled_war_deletion.sql` add
visibility and a narrowly scoped permanent deletion path. Apply both before running
the updated app. Prior migrations are unchanged. Deletion is an explicit exception
to retaining historical outcomes, never a reset: an active admin must type the exact
title, provide a 10–500 character reason and attest that this is a simulation/test
War (the existing model does not otherwise distinguish simulations). Live and
unreconciled Closing Wars cannot be deleted. Draft/Upcoming require zero accepted
submissions; Completed requires reconciled closure and complete allocations.

`public.delete_war_permanently` rechecks eligibility under the common game row lock,
then removes events, allocations, preferences, submissions, membership, packages,
War-scoped audits and the War in one transaction. Its independent deletion audit
retains the deleted ID/title, admin, reason, counts, simulation attestation and DB
time with `game_id = NULL`. Student/authentication data and unrelated history remain.
The private permit is bound to one War, transaction and backend, cannot be set via
client input or PostgreSQL settings, and permits DELETE only. Ordinary configuration,
consent, history and quota guards remain enabled. Failure rolls everything back.
Back up the database before intentional permanent cleanup; there is no undo.

The migration owner can execute the deletion function. If production uses a distinct
runtime role, the operator must explicitly grant only this function to that role:
`GRANT EXECUTE ON FUNCTION public.delete_war_permanently(text,text,text,text,boolean)
TO your_runtime_role;`. Do not grant runtime access to `war_admin_private`, its tables,
DDL privileges or membership in the migration-owner role. Public execution is revoked.
The server verifies the session/role before passing the admin ID; possession of a
privileged database credential remains an administrative trust boundary.

Admin-only result downloads use ExcelJS and repeatable-read committed snapshots:
one sheet per package, FCFS sequence order, text identity cells (no formula inference),
receipt time from `accepted_at` with full WIB date and milliseconds. Non-Completed
exports are labelled temporary in the UI, filename, workbook subject and print header.

Verification of the targeted improvements (2026-11-12): lint, typecheck and the
production standalone build passed. All 50 service/unit/integration tests passed
against isolated PostgreSQL 18, including 200/500 concurrent submissions, deletion
rollback and restricted runtime-role permissions. All 21 browser flows were verified
with Chromium, five viewport widths and axe checks: the consolidated browser run
passed 20 flows, and the remaining management flow passed its targeted retry after
an ambiguous repeated-fixture title selector was scoped to the War ID. Test layout
sessions are reused to respect the unchanged production sign-in rate limits.
Both incremental migrations and a fresh empty database migration were verified.
No live Resend delivery, Docker image build, Neon/Vercel deployment, or separate
HTTP load harness was run; these local checks are not production capacity evidence.
