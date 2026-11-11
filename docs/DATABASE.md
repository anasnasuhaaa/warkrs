# PostgreSQL Data Model — Proposed Logical Schema

Use Drizzle ORM migrations. Names/types below are a recommended starting point, not a reason to discard existing repository conventions. Prefer UUID IDs except where a monotonic `BIGINT` event cursor or sequence is useful. Use `timestamptz` for timestamps and maintain referential integrity.

## 1. Core tables

### `users`

- `id` PK; `full_name`; `email_normalized` unique; `password_hash` nullable until activation; `email_verified_at`; `role` (`ADMIN`/`STUDENT`); `created_at`, `updated_at`.
- Store activated account state explicitly. Usernames and emails are immutable during a live game unless a separately approved administrative policy exists.
- Sessions/account tables required by chosen maintained auth library are permitted.

### `account_tokens`

- `id`, `user_id`, `token_hash`, `purpose` (`ACTIVATION`/`PASSWORD_RESET`), `expires_at`, `consumed_at`, `created_at`.
- Store **hashes**, not raw activation tokens. Tokens are single-use and time limited. Resend sends the token-bearing URL; never log it.

### `games`

- `id`, `slug` unique, `title`, `terms_text`, `terms_version`, `starts_at`, `ends_at`, `published_at` nullable, `status` or effective lifecycle fields, `closed_at`, `close_reason`, `closed_by_user_id`, `next_submission_sequence` default 0, `created_by`, `created_at`, `updated_at`.
- Use server-enforced state logic; time-based status cannot depend solely on an occasionally invoked Cron.
- Once published, immutable configuration. Only allowed operational close fields may change while Live.

### `game_packages`

- `id`, `game_id` FK, `name`, `capacity` positive integer, `allocated_count` default 0, `created_at`.
- Unique `(game_id, normalized_name)`; `CHECK(capacity > 0)` and `CHECK(allocated_count >= 0 AND allocated_count <= capacity)`.
- Package occupancy is an authoritative counter updated in the allocation transaction, or derived consistently from allocations; never maintain independent counters without a clear transaction invariant.

### `game_participants`

- Composite PK `(game_id, user_id)` (or surrogate PK plus unique pair). Represents the **whitelist** row.
- `joined_at` nullable; `consented_at` nullable; `consented_terms_version` nullable; `whitelisted_at`, `whitelisted_by`.
- Join requires an existing whitelist row. A joined student has affirmative consent to the currently frozen published terms.
- Whitelist entries cannot change after publication.

### `war_submissions`

- `id`, `game_id`, `user_id`, `sequence` **monotonic within game**, `accepted_at`, `created_at`.
- Unique `(game_id, user_id)` and unique `(game_id, sequence)`.
- In v1, successful admission and allocation happen in **one transaction**: no independently running QUEUED worker is required. Expose `Submitting` while awaiting response; derive `Allocated` from committed result. Optional reserved statuses must not create stuck partial submissions.

### `war_preferences`

- `submission_id`, `rank` (1-based), `package_id`.
- PK or unique `(submission_id, rank)`, unique `(submission_id, package_id)`.
- Enforce exact permutation of a game's packages in application transaction logic because cross-row completeness cannot be expressed as a basic CHECK constraint.

### `war_allocations`

- `id`, `submission_id` unique, `game_id`, `user_id`, `package_id`, `awarded_rank`, `allocated_at`.
- Unique `(game_id, user_id)`. Ensure `package_id` belongs to `game_id`; use relevant composite FK or validate in the same transaction.
- This is the immutable official result for that game.

### `war_events`

- Monotonic `event_id BIGINT` PK, `game_id`, `submission_id` nullable, `actor_user_id` nullable, `event_type`, `package_id` nullable, `rank` nullable, `metadata JSONB` with safe fields, `created_at`.
- Types such as `SUBMISSION_ACCEPTED`, `PREFERENCE_SKIPPED_FULL`, `PACKAGE_ALLOCATED`, `GAME_CLOSING`, `GAME_COMPLETED`.
- Append-only during normal application use. Fetch by `event_id > cursor` with authorization and limit/pagination.

### `admin_audit_logs`

- `id`, `admin_user_id`, `game_id` nullable, `action`, `reason` nullable, `metadata JSONB`, `created_at`.
- Record import, publication and especially manual End War. Do not store password/token secrets.

## 2. Required indexes and constraints

- Unique normalized email; normalized game package names within game; unique whitelist membership.
- Unique submission per `(game, user)`; unique `(game, sequence)`; unique `(game, user)` allocation.
- Unique preference ranks and packages within a submission.
- Indexed game list by lifecycle time (`starts_at`, `ends_at`, `published_at`); whitelist by user; events by `(game_id, event_id)`; allocations by `(game_id, package_id)`.
- Foreign keys prevent references to non-existent users, games, packages and submissions. Validate cross-game references in allocation and join transactions.
- Capacity checks enforced in SQL, not only TypeScript. Never use a plain 'read quota then write new value' sequence without locking or a conditional update.

## 3. Canonical invariants to test

1. `COUNT(allocations where game = G and user = U) <= 1`.
2. `allocated_count(package) <= capacity(package)`; counts match persisted allocations.
3. Every committed submission has one allocation and a complete unique ranking.
4. Allocation package belongs to its game and is one of its submitted preferences.
5. Awarded rank is the earliest rank with capacity available **at that submission's serialized turn**.
6. Published package total capacity >= total whitelisted membership.
7. No previously committed result changes on retry, reload, admin close or game completion.

## 4. Migrations and seed data

Use reviewed, versioned migrations. No auto destructive schema push in production. Minimal development seed: one admin account provisioned securely, a few *fictional* students/games/packs, never real imported email addresses. Do not run data-wiping seeds against an existing staging/production database.
