# Phase 08 — Local release readiness

Implementation and local verification are complete through Phase 08. This is a
local pre-release report; external production deployment is not performed or signed off.
No Git push, real cohort import or email delivery occurred.

## Evidence

| Check | Status | Evidence |
| --- | --- | --- |
| Existing app / modular monolith | PASS | Root App Router/npm preserved; no recreated app or added queue/service |
| Typecheck / ESLint / production build | PASS | Current source builds without DB/auth/email build secrets |
| Real PostgreSQL invariants/security | PASS | 24 tests, including 200/500 module bursts, fallback, duplicates, row-lock deadlines, End War race, actual rollback, consent and authorization |
| Browser flows / responsive accessibility | PASS | Eight Chromium scenarios at 320/375/768/1440px; axe WCAG 2 A/AA + 2.1 AA, keyboard, offline recovery, actual bounded SSE |
| Docker images / migrations | PASS | Clean `npm ci`, multi-stage standalone app, explicit tooling migration, idempotent rerun; web UID 1001 |
| Compose health / network | PASS | PostgreSQL + web healthy; readiness 200; only web `127.0.0.1:3000` mapped; no database host port |
| HTTP 200 / 500 participant bursts | PASS | All 700 requests accepted/allocated across independent games, zero oversell/duplicates; stable HTTP retry |
| DB/container restart persistence | PASS | 700 submissions, 700 allocations, occupancy sum 700 and 2,150 events unchanged; readiness recovered |
| Backup / isolated restore | PASS | Custom-format pg_dump restored into a new DB; same 700 results/2,150 events, zero counter mismatch/incomplete ranking; restored outcome trigger rejects edits |
| Sensitive artifact exclusion | PASS | Only placeholder `.env.example` tracked; generated session fixtures, screenshots/traces, env and dump excluded from Git/Docker context |
| Dependency audit | PASS with recorded maintenance limits | 0 high/critical; 15 moderate + 2 low transitive tooling advisories; inherited ESLint 9 EOL/upstream peer limit documented in DEPLOYMENT.md |
| Actual Neon/Vercel deployment | NOT VERIFIED | No external account connection/deploy; shared pg transaction driver and staging configuration documented |
| Live Resend / production HTTPS/proxy | NOT VERIFIED | No credentials or approved real recipients; Caddy example and operator steps supplied |
| Production hardware / WAN / 500-browser polling soak | NOT VERIFIED | Local simultaneous-submit measurements below do not model every deployment condition |

## HTTP measurements

Measured 11 November 2026 on the shared development host: Linux, Intel Core i3-1215U,
8 reported logical CPUs, approximately 7 GiB RAM (swap in use); Docker Node 22.23.4,
Next 16.4.6, PostgreSQL 17.11. One web container, one DB container, pool max 5,
15-second acquisition/connect bound, 10-second statement timeout, 30-second submit
function budget. Same engine/migrations for all environments. Polling configured;
no concurrent browser polling workload included in these measured bursts.

Accounts, consent and library-signed sessions were prepared before timing. All
requests then started together over the internal Docker HTTP network, including
session/role checks, persisted rate limiting, validation and atomic allocation.
Builds/fixture preparation had finished before timing.

| Concurrent POSTs | Success | Total burst | p50 | p95 | p99 | Oversold / duplicates |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 200 | 2,841 ms | 1,819 ms | 2,703 ms | 2,783 ms | 0 / 0 |
| 500 | 500 | 5,426 ms | 3,304 ms | 5,176 ms | 5,324 ms | 0 / 0 |

The runner asserted exact sequences 1..N, one immutable result per student, matching
occupancy/allocation counts and stable retry. Post-run idle samples were about
52 MiB web and 38 MiB DB; these are not peak resource measurements. Module-test
latency varied when builds and fixture work shared the host; see earlier phase
reports for those narrower measurements. No production throughput guarantee is made.
Reproduction: `docs/LOAD_TESTING.md`; generated raw session fixtures remain private.

## Final reliability changes

Explicit migration runner with safe failures, standalone static/public asset
packaging and correct `npm start`, readiness endpoint, profiled Compose tooling,
local-only fictional HTTP load scripts, database-backed rate/CSRF/unauthenticated
API tests, import audit counts without identities/secrets, backup/restore examples,
reverse-proxy example, event runbook and updated README.

A final browser rerun caught contrast during the disabled-to-enabled button
transition. Disabled buttons now keep full text contrast, with grayscale/dashed
styling and native disabled behavior. This is a presentation fix; allocation
logic and HTTP measurements are unchanged. Toolchain maintenance limits and the
pool wait adjustment from measured contention are explicitly documented.

## Delivery history

| Phase | Local commit |
| --- | --- |
| 01 foundation | b751d45 |
| 02 accounts/auth | ed18162 |
| 03 admin/drafts | 85a3fae |
| 04 lifecycle/consent | 8260d5d |
| 05 transactional FCFS | 7a5291a |
| 06 durable live views | 902fb3e |
| 07 responsive/accessibility | e7afd84 |
| 08 readiness | Final local commit titled `chore(release): verify deployment and reliability readiness` |

Key implementation: `modules/allocation/service.ts`, `modules/games/lifecycle.ts`,
`modules/activity/queries.ts`, `db/schema.ts` and reviewed SQL migrations;
`lib/auth.ts`/authorization and account service; official `components/ui` with
composed domain views; `Dockerfile`, `compose.yaml`, operator/load scripts and
`docs/RUNBOOK.md`. See per-phase reports for focused scope and verification.

Final rerun: eight browser scenarios passed in 22.3 seconds against the standalone
production start path after the contrast fix. Final local/Docker builds, lint and
typecheck passed. The dedicated verification containers were stopped after testing;
Compose named volumes, the isolated restored DB and private artifacts were retained.
No unrelated service was stopped, and no event database was reset.
