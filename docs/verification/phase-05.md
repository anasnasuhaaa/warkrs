# Phase 05 verification

PASS: 20 cumulative tests against real PostgreSQL 17; typecheck, ESLint and build.
The same `pg`/Drizzle engine used by route handlers performed all transaction tests.

Measured on this development host, Node 22.22.1, Docker PostgreSQL on loopback,
5 database connections, simultaneous module invocations (not HTTP/browser load):

| Clients | Total burst | p95 | p99 | Oversold / duplicate allocations |
| --- | --- | --- | --- | --- |
| 200 | 2,204 ms | 2,072 ms | 2,169 ms | 0 / 0 |
| 500 | 4,661 ms | 4,377 ms | 4,571 ms | 0 / 0 |

Every accepted user received one allocation, all preferences were recorded, sequences
were exactly 1..N, fallback matched serialized turn, occupancy matched allocations,
and game remained Live after everyone submitted. Also tested one-seat race,
concurrent duplicates/reversed retry, lost-response lookup, no prestart admission,
invalid/duplicate/missing/foreign IDs, inactive/unjoined/nonwhitelist denial,
late Live join, deadline after lock wait, End War contention, immutable Completed
results, injected DB failure rolling back all writes/events and deferred SQL refusal
of partial commits. A fixture-order assumption was corrected before the final pass.

UI: one-tap all-package ranking, reorder/remove, no duplicate picks, explicit pending,
authoritative result/sequence/time, retry lookup, no selection during Upcoming.

NOT VERIFIED: actual Neon service/network, Vercel or production hardware throughput.
`pg` uses the same PostgreSQL interactive transaction protocol in both deployments;
no Neon HTTP driver or permanent worker is used. These measurements do not include
HTTP/session overhead and are not a deployment capacity promise.
