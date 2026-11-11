# Phase 03 — Draft Games, Packages, and Whitelists

## Read first

`AGENTS.md`, `docs/PRD.md`, `docs/BUSINESS_RULES.md`, `docs/DATABASE.md`, `docs/API_CONTRACTS.md`; inspect current code and completed phases.

## Objective

Give administrators a clear, responsive interface for creating **Draft** games, package names/quotas and per-game whitelists, with safe validation before publication.

## Tasks

1. Implement `games`, `game_packages`, `game_participants` (whitelist), audit schema/migrations with constraints and efficient queries.
2. Admin game list and Draft creation/edit UI: title, terms, start/end (display Asia/Jakarta, persist UTC), packages with only **name** and **quota**. No course timetable/parallel-class editor. No priority count field.
3. Per-game whitelist UI: searchable student list, individual selection, **Select All** eligible students, selected count and clear saved state. Whitelist membership is separate from the later `joined_at` value.
4. Validation: at least one package, one participant, unique package names, positive quotas, end > start, required terms, and **sum quotas >= total whitelisted count**. Show a useful summary and block publishing if invalid.
5. Publish Draft → Upcoming/Live effective published state, with server-side freeze of packages, quotas, whitelist, terms, and start/end schedule. Prevent direct PATCH/DELETE after publication even for admin.
6. Add student-facing game list shell (eligible Upcoming/Live/Completed; no join action yet beyond placeholder), and admin counts for packages, whitelist and capacity.
7. Use shadcn/ui Dialog/AlertDialog, Table, Input, Card, Checkbox, Badge, Tabs and responsive variants; do not overbuild data grids.

## Out of scope

No war submission, live updates, participant joining logic, reset button or automatically cloned game feature. Simulation means creating independent games.

## Acceptance criteria

- Admin creates and publishes a valid game; invalid dates, insufficient capacity, duplicate package names fail safely.
- Non-admin cannot create/modify/publish.
- Published configuration and whitelist are immutable, even through API requests.
- Package priority count is **not a field** anywhere; it will always match package count.
- UI is functional at phone/tablet/desktop widths.

## Verification and delivery

Focused schema and admin authorization tests + typecheck/lint/build. Make one local Conventional Commit such as `feat(admin): add game and whitelist management`. **DO NOT PUSH.**
