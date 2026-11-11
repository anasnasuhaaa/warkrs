# Business Rules — Authoritative Reference

Use this file to resolve product decisions. Do not silently change these rules during implementation.

## A. Membership and accounts

- No open signup page. Admin pre-imports full name and email; each student receives an activation link and chooses a password.
- A game has an explicit whitelist. Admin may include all eligible accounts with Select All or choose individuals, but only in Draft.
- Whitelisted does **not** mean joined. Student must open the game, accept the displayed terms using an **unchecked checkbox**, then press **Join Game**.
- Joining is permitted during **Upcoming and Live**, until game closure. A late join receives no queue advantage.
- Student must be authenticated, activated, whitelisted and joined before submitting.
- Admin can monitor whitelisted, joined, not joined, submitted, and allocated counts. Be clear that 'not joined' and 'not submitted' are different statuses.
- Displaying full names in winner lists/events is allowed only inside authorized game views and explicitly explained in the terms.

## B. Game configuration and immutability

- Multiple independent games: simulation or official. The name is free-form, e.g. "War KRS Ilkomerz Semester 4".
- Each game has package **name and quota only**. Do not build course/parallel/time-table management.
- Priority count is **not configurable**. It always equals package count; all packages must be ranked.
- Draft configuration includes game title, terms, start/end times, packages/quotas, and whitelist. A game must have >= 1 package and >= 1 whitelisted participant to publish.
- Block publish if sum(package quotas) < number of whitelisted students. Also validate times, package name uniqueness, quotas > 0 and required terms.
- Publishing freezes all package names/quotas, whitelist, terms and schedule; Upcoming and Live are **read-only for configuration**. Admin may view/monitor and exercise only the special End War operation while Live.
- No reset, re-run-in-place, edit of historical allocation, or deletion of completed results. To simulate again, manually create another game.

## C. War opening, ranking and submission

- Countdown may be shown early; **pre-selection is forbidden**. Ranking UI activates only when authoritative server state is Live.
- Students rank every package exactly once. Primary UI: one-tap sequential package picker; support removing/changing picks before submit.
- Disable submit until locally complete and unique. Revalidate all conditions server-side; client checks are not security.
- A student gets **one submission per game**, and once accepted it cannot be amended, cancelled, or resubmitted for a new result.
- Allocator tries priority 1, then 2, etc., and awards the first package with seats remaining; each considered full package may generate a yellow fallback event, followed by one green success event.
- Because capacity covers all whitelisted participants and all packages are ranked, every **valid, accepted submission** must allocate exactly one package (assuming no external changes or data corruption). A failure is an invariant violation to investigate, not a routine user-facing alternative.

## D. Fairness and concurrency

- FCFS means **server/database-authoritative acceptance order**. Do not pretend client click timestamps are globally fair.
- Assign an immutable increasing sequence per game **inside the same serialized database transaction** that accepts/allocates the submission. Use a game-level lock/row lock and unique constraints.
- Exactly one allocation per student/game, no package over capacity, no duplicate sequence or duplicate preference.
- For v1, one request can be admitted and fully allocated atomically. An always-on queue worker is **not required**; durable queued jobs are optional future infrastructure, not a prerequisite.
- If requests contend, database serialization determines the accepted order. Log each outcome with its sequence. Retries must return the recorded outcome, not consume another seat.
- The server determines timing and acceptance boundaries. Define user-facing deadline behavior plainly: requests must be **accepted by the server before closure**, not merely clicked locally.

## E. Closing and historical integrity

- Admin sets opening and closing times. Game does **not** automatically close simply because all participants have submitted.
- At deadline or after confirmed manual **End War** with required reason, reject **new admissions**. Finish/retain work already accepted; show a Closing state until settled, then Completed.
- End War is an operational exception, **not** permission to edit participants, quotas, terms, or outcomes while Live.
- Manual close records admin ID, time, and reason in audit data. Scheduled close records its reason/type.
- Game, submissions, allocations and event history remain read-only when Completed. No reset.

## F. Transparency and privacy

- Authorized participants can see live package occupancy, package winner names, and log messages with meaningful event order and server timestamps.
- Display green success, amber fallback, and explicit closure/errors. Avoid misleading 'failed entirely' wording when a fallback succeeds.
- An event may only be broadcast after the underlying transaction commits. Queries/snapshots remain authoritative after reconnect.
- Live views are not publicly accessible and must not leak user email, password hashes or activation links.

## G. Product boundaries

- No university integration, automatic official course registration, schedule conflict optimizer, payments, random assignment, self-registration, game reset, or editable submission.
- The cohort must separately communicate package composition and agree on how students will register in the official university KRS system.
