# Phase 04 — Game Lifecycle, Manual Join, Consent, and End War

## Read first

`AGENTS.md`, `docs/PRD.md`, `docs/BUSINESS_RULES.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/DATABASE.md`.

## Objective

Implement server-authoritative game lifecycle, consent-based manual join, countdown, and the admin's ability to end a Live game early without editing live configuration.

## Tasks

1. Implement consistent effective game status: Draft, Upcoming, Live, Closing, Completed. Enforce time windows by server/DB time; scheduled opening/closing cannot depend on a browser timer or perpetual scheduler.
2. Implement student game detail/waiting room; client countdown uses `serverNow` and periodic resync. Keep ranking unavailable until Live (the ranking feature arrives in Phase 05).
3. Implement manual **Join Game** for authenticated, activated and whitelisted students during **Upcoming or Live**. Present immutable game terms with required **unchecked consent checkbox**. Persist join/consent/terms version/timestamps on server. Repeat joins are idempotent.
4. Ensure a student who joins late during Live has the same eligible submit rights (once Phase 05 exists) but no priority advantage. Reject join during Draft/Closing/Completed and by nonwhitelisted students.
5. Add admin participant monitoring: total whitelisted, joined, not joined, later submissions; do not conflate the counts.
6. Add **End War** action that is available to admins only during Live, with shadcn/ui AlertDialog, mandatory typed reason and a second confirmation. Enforce in server API; store actor/time/reason and append audit event. No admin config edit while Live. Do not implement reset.
7. Prepare safe Closing → Completed transition support. When the allocation transaction exists, it must interlock with End War; never discard an accepted result. No early automatic stop merely because all joined/submitted.
8. Update Indonesian UI copy, empty states and mobile layouts.

## Out of scope

No actual ranking/allocation implementation yet, no per-package realtime winners yet, no scheduled external cron, and no history deletion.

## Acceptance criteria

- Joining is allowed only for whitelisted users during Upcoming/Live and only with actual consent.
- Unjoined users cannot obtain submission privileges through a direct API call.
- Time validation works at boundaries and across refresh.
- Admin cannot modify published configuration but can manually end Live with reason and audit.
- Scheduled end and manual end reject late actions; all-submitted does not close the game.

## Verification and delivery

Test permission and time-boundary cases with a controllable clock/DB time approach, plus typecheck/lint/build. Commit locally as `feat(game): add lifecycle and consent-based joining`. **DO NOT PUSH.**
