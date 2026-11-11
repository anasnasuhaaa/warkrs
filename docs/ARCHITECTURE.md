# Architecture and Allocation Strategy

## 1. Guiding principles

One Next.js App Router codebase (modular monolith), one PostgreSQL source of truth, server-enforced authorization, minimal infrastructure. Operate on both **Vercel + Neon (staging)** and **Docker Compose + PostgreSQL (production)** without environment-specific allocation semantics.

## 2. Suggested modules (adapt to existing repository)

```text
src/
  app/                   # App Router: auth, student, admin, APIs
  components/ui/         # shadcn/ui-generated primitives
  components/domain/     # game cards, ranking picker, quota bars, log feed
  lib/                   # auth, config, validation, database setup
  db/                    # Drizzle schema, migrations, queries
  modules/
    accounts/            # imports, activation, profile
    games/               # draft/publish/states, joins and consent
    allocation/          # transactional FCFS use case
    activity/            # persisted events, realtime/read models
    admin/               # audit and monitoring
```

Place domain logic in server-only modules, not React components. API routes/actions call those modules. Use a clearly transaction-capable PostgreSQL client with Drizzle in both environments; do not select an HTTP-only driver mode that cannot perform the required interactive transaction/lock.

## 3. Important: v1 does not need a permanent worker

Earlier brainstorming mentioned a durable queue worker. For an initial group of ~200 users, the simpler, more portable design is **transactionally serialized admission and allocation per game**, all in one short PostgreSQL transaction. This fits request-triggered Vercel Functions and self-hosted Node.js without a background daemon.

### Authoritative FCFS transaction (conceptual)

1. Validate authentication, active account, game/participant context and request shape before admission.
2. Open DB transaction. Acquire a **game-specific row lock** (`SELECT ... FOR UPDATE` on game or equivalent) before assigning FCFS sequence and changing package quota. All operations affecting acceptance/close use consistent lock ordering.
3. Re-check authoritative game Live/Closing/deadline status using DB/server time **inside the critical section**; confirm whitelisted, joined, consent and no existing submission.
4. Validate the ranking is an exact permutation of all package IDs in the published game.
5. Atomically increment a game-specific sequence counter. Insert the unique submission and ranked preferences.
6. For each ranked package, read/check the remaining quota and atomically reserve the first available seat. Use conditional updates and DB constraints; never trust the displayed quota.
7. Insert one allocation and append structured fallback/success events (and relevant audit data).
8. Commit, then return the immutable result. Real-time read/broadcast happens only after commit.

**Why this works:** a per-game lock makes admission and quota consumption sequential in the authoritative database even if API instances run concurrently. A unique `(game_id, user_id)` prevents duplicate submits; per-package constraints prevent oversubscription. Use bounded transactions: no email sending, SSE waits, external calls, or expensive unrelated work while holding the game lock.

**Fairness definition:** the official order is the database serialization/acceptance sequence. It cannot prove which student touched their screen first across different networks. Explain this clearly in the UI/terms. Do not present raw client timestamps as the tie breaker.

### Duplicates and uncertain network responses

If the same student retries, read and return their previously committed submission/assignment; do not allocate again. If their initial request was never accepted, a retry is a new admission attempt subject to the current time window. A user losing connectivity after commit can recover result by querying `GET /me/submission`.

### Closing interaction

Manual End War and transactional submit must share the same game lock / consistent transition rules. End War requires a reason and audit entry, closes future admission, and never rewrites previously committed results. Scheduled end is enforced by DB/server time even without Cron. The `Closing` and `Completed` status may be reconciled lazily on status reads or via safe short maintenance steps; do not depend solely on a constantly running scheduler to reject late submissions.

## 4. Realtime design

**Database is the source of truth**, not the realtime transport.

- Every allocation event is persisted with monotonically increasing event ID and server timestamp.
- Read APIs support snapshots (`quotas`, `winners`, `own status`) and incremental events after a cursor.
- Production Docker may expose SSE from the running Node.js service; handle backpressure, reconnect, heartbeats, authorized access, and last event IDs. It must NOT rely on in-memory-only event history; poll persistent events or use an optional PostgreSQL notification as an optimization.
- Vercel staging uses **bounded HTTP polling** (initially around 3–5 seconds while Live), plus immediate result fetch after submit. Long-lived SSE is not a hard dependency for Vercel because Function duration is limited. A common client data service abstracts the two transports.
- No WebSocket server is required. Do not claim identical transport latency across staging and production.

## 5. Lifecycle and data ownership

Persist Draft/Upcoming/Live/Closing/Completed state transitions or derive an **effective state** consistently from stored publication/start/end/manual-stop data plus authoritative DB clock. Avoid a schema where a game remains logically Upcoming forever if no cron executes. Distinguish configuration immutability from current effective status. 'End War' is the only Live admin mutation and is audited.

## 6. Scale and operational concerns

- ~200 concurrent students is a planning estimate, not a throughput guarantee. Test the actual transaction's p95/p99 latency and DB connection contention.
- Vercel Functions can fan out; use conservative PostgreSQL connection pools per instance and Neon-compatible pooling. Keep contention critical sections short. Do not hold DB connections during SSE.
- Docker deployment: one Next.js service, one PostgreSQL service, reverse proxy (Caddy/Nginx), health checks, persistent database volume and backups. Separate process only if an operational need emerges.
- Use structured logging, correlation IDs, useful status codes, and server metrics; do not expose sensitive fields.

## 7. Avoid premature optimization

Do not add Redis, microservices, Kubernetes, separate job broker, Go/Rust service or global distributed locks as default. They can add failure modes without addressing the fundamental DB consistency requirements. Upgrade only when a measured bottleneck warrants it.

## References

- Drizzle transactions: https://orm.drizzle.team/docs/transactions
- Vercel function limits/duration: https://vercel.com/docs/functions/configuring-functions/duration
- Vercel streaming runtime: https://vercel.com/docs/functions/runtimes
- shadcn/ui for existing Next.js apps: https://ui.shadcn.com/docs/installation/next

## Implemented lifecycle

Effective status uses PostgreSQL `clock_timestamp()` after the game row lock, not
transaction-start `now()` or the browser clock. Join records affirmative consent
and frozen terms version once; a mandatory shared privacy/fairness notice is shown
alongside admin-authored terms. Scheduled closure is reconciled on authorized reads
and enforced directly on mutations even if no status read or cron has occurred.

With atomic admission/allocation, acquiring the shared close lock proves there is
no partially accepted job still running. Closing and Completed events can therefore
commit together; Closing has zero duration when there is nothing outstanding.
Manual close preserves all outcomes and records actor/reason. Completed rows,
consent, published configuration and audit/event history are protected by triggers.
