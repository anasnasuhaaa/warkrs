# Safe local load testing

These scripts are intentionally restricted to an explicitly supplied database
whose name ends `_test`, disabled email, and local/internal HTTP targets
(`localhost`, `127.0.0.1`, `web`). Never run against an event/staging dataset.
All accounts and games are fictional. Sessions are prepared using the maintained
Better Auth server API, not custom cookie signatures. Preparation/joins/logins are
outside timing; the measured burst includes HTTP, session/role checks, persisted
rate limiting, validation and the real allocation transaction.

## Reproduce on Compose

Use a dedicated Compose project and ignored env file with database name ending
`_test`; `APP_BASE_URL=http://localhost:3000`, `EMAIL_MODE=disabled`, unique secrets.
Start/migrate as in the README. The following assumes the default Compose project;
if using `-p`/`--env-file`, apply the same arguments to every command.

```sh
docker compose run --rm -v "$PWD/.test-artifacts:/app/.test-artifacts" tooling npm run test:load:prepare -- 200
docker compose run --rm -e LOAD_BASE_URL=http://web:3000 -v "$PWD/.test-artifacts:/app/.test-artifacts" tooling npm run test:load -- 200
docker compose run --rm -v "$PWD/.test-artifacts:/app/.test-artifacts" tooling npm run test:load:prepare -- 500
docker compose run --rm -e LOAD_BASE_URL=http://web:3000 -v "$PWD/.test-artifacts:/app/.test-artifacts" tooling npm run test:load -- 500
```

`test:load:prepare` creates a fresh independent Live game, 200/500 imported/active
fictional accounts, complete whitelist/consent and library-signed sessions. It
prints progress only, never passwords/tokens/cookies. Generated session files have
mode 0600 and are ignored; Docker-created files may be root-owned. Do not share
or commit them. `test:load` refuses an already-used fixture: generate another game
for each measured run, never reset a game.

The runner starts all POSTs together, reports total/p50/p95/p99 and failure codes,
then asserts DB counts/counters, no oversell/duplicates, exact sequence 1..N,
unique immutable results and stable HTTP retry. A failure exits nonzero while
retaining already accepted outcomes for investigation. Metrics JSON has no session
material and stays in `.test-artifacts/load-result-*.json` until summarized.

## Interpret correctly

`npm test` additionally checks 200/500 simultaneous **module** invocations, fallback,
close/deadline contention, duplicates and real DB failure rollback. HTTP scripts
measure the endpoint; neither run simulates 500 browsers polling continuously,
a remote mobile network, cold Vercel fanout, TLS or Neon latency. Browser tests
exercise two independent clients and reconnect, not a 500-browser soak test.

Record CPU/RAM, Node/PostgreSQL versions, instance count, driver pool settings,
HTTP origin, transport mode and other host work. Collect `docker stats --no-stream`
and database connection/lock metrics without exposing credentials. Run on intended
production hardware with HTTPS and a realistic polling workload before the actual
war; development measurements are not a capacity guarantee. See Phase 08 report
for measured observations and explicit external checks still outstanding.
