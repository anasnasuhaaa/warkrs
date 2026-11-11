# Phase 06 verification

PASS: 22 cumulative PostgreSQL-backed tests, typecheck, lint and production build.
Two participants submitting concurrently converge on the same quota/count snapshots
and durable event feed. Pagination/replay yields no lost or duplicate IDs. Unjoined
and nonwhitelisted viewers are denied; emails/passwords/tokens are absent from live
responses. An open transaction's event is invisible and remains absent after rollback.

UI: Main/Packages/Activity tabs, quotas/remaining seats, paginated winner dialogs,
green success and amber fallback records, immutable sequence/server timestamps,
admin's distinct whitelist/join/not-join/submitted/allocated counts. Client polling
recovers with backoff/visibility/online handling and preserves reading position.
Optional bounded SSE reads the same durable feed and gracefully falls back to polling.

Actual browser viewport/transport smoke checks are recorded in Phase 07; external
Vercel/Neon deployment and HTTPS/proxy behavior remain unverified.

Reliability adjustment from measurement: a concurrent build + 500-client rerun hit
the original five-second pool acquisition bound. Increased it to 15 seconds and
set submit's function duration to 30 seconds. Final full suite passed (200 p95
2,140 ms; 500 p95 4,381 ms; zero oversell/duplicates). This is a pool wait budget,
not a claim that arbitrary production load will meet a latency target.
