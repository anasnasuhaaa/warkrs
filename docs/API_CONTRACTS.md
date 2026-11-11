# API Contracts and Authorization — Proposed

These are behavioral contracts. Codex may implement them using Next.js Route Handlers and/or secure Server Actions as appropriate, but must preserve semantics, response shapes, permissions and server-side validation. Use one consistent error convention.

## 1. Error and time conventions

- JSON success uses `{ data: ... }`; errors use `{ error: { code, message } }` with Indonesian user-facing `message`.
- Representative codes: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `GAME_NOT_LIVE` (409), `GAME_CLOSED` (410), `INVALID_RANKING` (422), `RATE_LIMITED` (429), `TEMPORARY_FAILURE` (503).
- All timestamps are ISO 8601 UTC on the wire; display Asia/Jakarta in UI. Include authoritative `serverNow` in game status payload for countdown synchronization.
- Never expose credential material, password hashes, token hashes, or private email addresses in participant live views.

## 2. Authentication and account APIs

- `POST /api/auth/activate` — consume valid single-use activation token and set password using approved auth flow.
- `POST /api/auth/login`, `POST /api/auth/logout` — may be auth-library-managed equivalents.
- `POST /api/auth/request-password-reset`, `/reset-password` — reasonable recovery option for imported accounts; no public signup.
- Admin account import/resend activation endpoints require admin role and validate rate/batch limits.

## 3. Student game APIs

- `GET /api/games` — list games this authenticated student is whitelisted for; include `status`, `startsAt`, `endsAt`, `joinedAt`, and high-level counts.
- `GET /api/games/:gameId` — authorized game details and terms, packages/quotas if published, effective status and `serverNow`. Unwhitelisted users get a safe authorization response.
- `POST /api/games/:gameId/join` — body `{ acceptedTermsVersion: string, accepted: true }`. Only whitelisted during Upcoming/Live. Set joined/consented timestamps **once**, return existing join on idempotent retry. Terms must match current frozen version.
- `POST /api/games/:gameId/submissions` — body `{ packageIds: string[] }`, **exact permutation of all published package IDs in order**. Only joined, activated, whitelisted users during Live; one immutable request. Return `{ data: { submissionId, sequence, acceptedAt, allocation: { packageId, awardedRank } } }`. If the same student repeats the request, return previous result (or an explicit stable conflict with retrieval path), **never allocate twice**. For best UX, prefer returning existing final result.
- `GET /api/games/:gameId/me/submission` — own immutable result or `null` if none; used on reload and ambiguous network failures.
- `GET /api/games/:gameId/packages` — package ID/name/capacity/allocated/remaining plus paginated assigned student full names; authorized participants/admin only.
- `GET /api/games/:gameId/events?after=<cursor>&limit=<n>` — authenticated incremental event feed; increasing cursor, stable pagination. Include event type, actor display name (authorized viewers only), affected package, rank, server timestamp and sequence when applicable.
- `GET /api/games/:gameId/snapshot` — one authoritative quota + summary snapshot, for realtime initial/reconnect refresh.

## 4. Admin APIs

- `POST /api/admin/students/import` — accept validated CSV/Excel-compatible input (CSV is minimum), normalize email and report inserted/duplicate/invalid rows. No implicit send to wrong recipients.
- `POST /api/admin/students/activation-email` — send/resend activation through Resend with bounded batch/error reporting.
- `POST /api/admin/games` — Draft creation.
- `PATCH /api/admin/games/:id` — Draft-only title, schedule, terms updates.
- `POST /api/admin/games/:id/packages` and associated update/delete — Draft-only.
- `PUT /api/admin/games/:id/whitelist` — Draft-only; supports select-all and individual IDs.
- `POST /api/admin/games/:id/publish` — validated publish transaction, including capacity >= whitelist count, immutable after commit.
- `GET /api/admin/games/:id/monitor` — whitelist/join/submission/allocation counts and relevant read models.
- `POST /api/admin/games/:id/end` — body `{ reason: string }`; **Live only**, explicit confirmation in UI, shared transaction locking with submits, audit log, reject new admissions and finalize safely. Idempotent repeats return current closure state without multiple conflicting audit entries.

## 5. Live transport

- **Canonical:** snapshots and `GET .../events?after=` cursor API.
- **Docker:** optional authenticated `GET .../events/stream` SSE with `id` / `Last-Event-ID`, heartbeat and reconnect; new data always comes from persisted events.
- **Vercel:** bounded polling of snapshot/event endpoints while Live, with backoff, visibility-aware frequency and immediate refresh after submit. Never require a perpetual Vercel function or a WebSocket server.
- Event IDs must be monotonic and not confused with the **submission FCFS sequence**; multiple events may belong to one submission.

## 6. Important interaction cases

| Situation | Expected behavior |
| --- | --- |
| Not on whitelist | Cannot join/read restricted game data/submit |
| On whitelist but not joined | Can join during Upcoming/Live; cannot submit until joined |
| Before start | Ranking/submit disabled on UI **and** rejected on server |
| Duplicate package in ranking | Local picker prevents; server returns 422 |
| Missing one package | Submit disabled; server returns 422 |
| Duplicate submission | Same historical result; no second seat consumed |
| Package #1 full | Record skip, try #2, etc. atomically |
| All packages allegedly full despite valid capacity | Treat as invariant breach, alert/rollback; do not silently claim a win |
| Network drops after successful commit | Re-open result via own submission endpoint |
| Admin stops during activity | No new accepted submissions; prior committed outcomes unchanged |
| Game reaches deadline | New admission rejected using authoritative clock; no dependency on client countdown |
