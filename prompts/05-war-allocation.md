# Phase 05 — One-Tap Ranking and Transactional FCFS Allocation

## Read first

Read **all** `docs/` files, especially `docs/BUSINESS_RULES.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/API_CONTRACTS.md`. Read `AGENTS.md`. Inspect the actual Drizzle driver and ensure it supports a true multi-statement transaction and PostgreSQL row lock.

## Objective

Implement the product's critical flow: during Live, an eligible joined student orders **every** package, submits **once**, and receives the first package in their ranking with available quota under a fully audited, concurrency-safe, server-authoritative FCFS rule.

## Mandatory implementation

1. Build mobile-first **one-tap sequential ranking** with shadcn/ui cards/buttons. Show rank number, allow removing/reordering choices before submit, hide/disable duplicate choices, and enable Submit only after all N packages are ranked exactly once. Preferences cannot be selected during Upcoming.
2. POST submission accepts an ordered `packageIds[]` exact permutation of **all** package IDs for the game. Server validates active session, activated/whitelisted/joined/consented participant, effective Live state, not closed, package membership, exact count, uniqueness, and no earlier submission. UI validation is not sufficient.
3. Implement a **short PostgreSQL transaction serialized per game**, e.g., lock the game row with `SELECT ... FOR UPDATE`. Use one consistent lock order for submission and manual End War. Within the same critical section: recheck eligibility/time and duplicate, assign monotonically increasing game-specific sequence, persist ranking, conditionally consume exactly one available package seat in priority order, create one allocation, and persist structured fallback/success events. Commit or rollback as one unit.
4. Ensure capacity cannot exceed limits under 200+ concurrent submissions. Add DB uniqueness constraints for `(game,user)` submissions, `(game,seq)`, allocation and preference rank/package. No local-memory mutex, timestamp-based winner selection, or client-reported quota.
5. Define official FCFS as serialized database **acceptance order**. Expose stable sequence and authoritative timestamp; do not falsely promise global click order across network paths.
6. Duplicates/retries/reloads must retrieve the existing immutable result; no second seat consumed. If a request never committed before cutoff, it did not obtain a reserved position. A lost HTTP response must not erase a committed result.
7. Ensure scheduled close and manual End War cannot slip new admissions in after closure; accepted outcomes remain durable. End War/submit concurrency must be tested with shared locking. Do not stop early if all submit.
8. Write Indonesian student result page and submit processing/failure states; avoid calling a click 'successful' until authoritative response/lookup confirms it.
9. **Do not require an always-running background worker in Vercel.** Prefer atomic request-time admission+allocation as described. No extra Redis/broker/service unless explicitly approved.

## Critical verification — required, not optional

- 200 simultaneous submissions contending for limited package quotas; add a larger stress scenario if practical. Verify zero oversubscription and one result per valid accepted user.
- Two users race for one remaining seat; exactly one gets it; other falls back in their ranked order.
- Duplicate POSTs from same user; exactly one package allocation and stable result.
- Incomplete, duplicate, foreign-game, early and late rankings rejected.
- Nonwhitelisted/unjoined attempts rejected; joins during Live can submit.
- Manual End War racing with submissions; finalized outcomes stable and no new admissions after close.
- DB errors rollback partial quota/events/allocations; recovery via result endpoint.

## Acceptance criteria

All tests above pass against **real PostgreSQL** (not only mocks). UI usable on phone and accessible by keyboard. Transaction/locking behavior works with intended Neon staging driver as well as local Docker PostgreSQL. Document if connection contention requires tuning.

## Delivery

Run focused tests, typecheck, lint and build; report key concurrency measurements/results and any remaining caveats. Commit locally as `feat(war): implement transactional fcfs allocation`. **DO NOT PUSH.**
