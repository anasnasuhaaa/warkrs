# Product Requirements Document (PRD)

## 1. Product summary

**Working name:** War Paket KRS Angkatan

A cohort-managed web application that lets eligible students compete in real time for pre-agreed KRS **package allocations**. Each package is just a **name** with a fixed quota; the academic course/schedule combinations are communicated separately in the cohort group. The application is **not** the university's official KRS portal.

**Primary audience:** cohort students, cohort event administrators, and developers.

**Product principle:** A fast, clear, auditable FCFS experience—not a lottery and not an optimization algorithm.

## 2. Problem and objective

Students who register for individual parallel classes on the official university website can end up with schedule conflicts. The cohort instead agrees on predefined combinations (packages) and uses this application to distribute those packages through a controlled war before students enter their KRS on the official campus portal.

**Goals:**
- Allocate exactly one package to every eligible student who submits validly on time, assuming published capacity covers all whitelisted participants.
- Honor authoritative FCFS ordering, including fallback priorities.
- Make remaining quotas, package winners, and allocation events transparent to authorized participants.
- Support repeated independent simulation games and the actual KRS war without ever resetting results.
- Stay practical to host on Vercel + Neon for staging and Docker + PostgreSQL for the production server.

**Not goals:** university timetable data, official KRS integration, automatic official enrollment, direct reservation of university seats, payments, random assignment, changing a submission after acceptance, resetting game results.

## 3. Roles

**Administrator**
- Imports student accounts (full name and email), triggers/resends email activation, monitors activation.
- Creates games, sets title/start/end/terms, defines named packages and quotas, configures per-game whitelist (including Select All), validates capacity and publishes.
- Monitors whitelist/join/submission/allocation counts and live results.
- Can close a Live game early with confirmation and recorded reason, but cannot edit published configuration or completed outcomes.

**Student**
- Activates an imported account via email, sets password, logs in.
- Views eligible games as Upcoming, Live, or Completed.
- Manually joins a whitelisted game after reading and accepting terms (even while Live).
- After war start, ranks **all** available packages with the one-tap interaction and submits **once**.
- Views own result, per-package quotas and named winners, and realtime logs while authorized.

## 4. Student journey

1. Admin imports the student's full name/email. System sends an activation email using Resend.
2. Student activates their account, creates a password, and logs in. There is no public registration form.
3. Student opens an eligible game. If not joined, the game shows the rules and an **unchecked required agreement checkbox** plus **Join Game**.
4. During Upcoming, student sees countdown and joined status; **no preferences can be selected or submitted**.
5. During Live, student can still join if whitelisted. A joined student selects packages **one at a time**; the UI numbers selections as priority 1, 2, ... up to the number of packages. Chosen packages cannot be duplicated. Student can correct ordering before submission.
6. Submit becomes enabled only after **every package** is ranked exactly once.
7. On submit, the server checks eligibility, freeze state, timing, ranking completeness, and duplicate submission, then assigns FCFS order and the first package with remaining capacity inside a safe transaction.
8. Student sees an authoritative acceptance/result. Reload or retry shows the same immutable outcome.
9. After closing, students can still view read-only results and logs. They then independently complete KRS on the university platform.

## 5. Administrator journey

1. Import/activate the cohort's accounts.
2. Create a **Draft** game: title, opening/closing times (Asia/Jakarta UI), game terms, package names/quotas, and whitelist (individual selection or Select All).
3. Review validation summary: number of whitelisted students, package capacities, total capacity, duplicate package names, date validity, and required fields.
4. Publish game. Publication freezes all game configuration/whitelist data; students may join during Upcoming or Live.
5. During Live, observe joins, non-joins, submissions, allocations, remaining quotas, named winners, and realtime activity.
6. If necessary, select **End War**, confirm the action, and enter a reason. New submissions are stopped; already accepted work is honored.
7. Completed games stay immutable. Create a new game for another simulation; no reset flow.

## 6. Game lifecycle

| State | Meaning | Join? | Submit? | Admin config edit? |
| --- | --- | --- | --- | --- |
| Draft | Unpublished setup | No | No | Yes |
| Upcoming | Published; start time not reached | Yes, if whitelisted | No | No |
| Live | Start reached, deadline not reached, no manual stop | Yes, if whitelisted | Yes, once joined | No |
| Closing | End time reached or admin stopped; outstanding accepted work settles | No | No new submissions | No |
| Completed | Outcomes finalized and retained | No | No | No |

The server must compute effective eligibility using authoritative time, not the user's device clock. The game **does not finish early solely because every student has submitted**.

## 7. Core requirements

**Games and packages**: independent games, named packages, nonnegative occupancy, fixed capacity, immutable published configuration; no schedule editor.

**Accounts**: invite-only import, secure activation, login/logout, password recovery, admin/student roles, per-game whitelist.

**Join and consent**: an affirmative checkbox, stored consent timestamp and terms version, no default consent, visible roster status to admin.

**War selection**: mobile-first one-tap ranking, all packages required, remove/reorder selection before submit, no duplicate package selection, immediate client feedback, server-side mirror validation.

**FCFS allocation**: authoritative database ordering, only one submission/allocation, per-game serialized transaction, package capacity check, fallback through ranked choices, consistent events/audit trail, idempotent response to repeat requests.

**Transparency**: live quotas, package winner lists, activity with green success and amber fallback events (and clear error/closure states), own submission status. Full names are visible only to authorized participants and disclosed in the terms.

**End War**: closes on scheduled deadline by default; admin may stop early with mandatory confirmation/reason; accepted submissions are not discarded; post-game data is read-only; no reset.

## 8. Usability and performance

- Responsive at common phone, tablet, and desktop widths; easy to use on a phone during a live Zoom meeting.
- Indonesian labels, clear instructions, keyboard access, empty/loading/error/retry states.
- Keep war page lightweight and responsive under an initial target of about **200 concurrent participants**; test higher burst scenarios (e.g., 500 simulated clients) before production.
- Zero oversold package seats, zero double allocations, zero unauthorized submissions under tests.
- Client countdown is informative; server acceptance time is authoritative.
- Live feeds recover after reconnect. The database remains the source of truth; no client-visible fake winners.

## 9. Release acceptance criteria

1. A non-imported user cannot self-register or access a game.
2. Admin can import students, send activation, create and publish separate games and select all/individual whitelist members.
3. Whitelisted student can join during Upcoming **or Live** after accepting terms; non-whitelisted student cannot.
4. No user can rank before Live; exactly all packages must be ranked and duplicates are prevented in the UI and API.
5. Under concurrent requests, each accepted student gets exactly one immutable result; quota never exceeds capacity; fallback is correct; FCFS order is auditable.
6. Publishing fails if total package capacity is below the whitelist count; once published, admin cannot change configuration.
7. Scheduled close and manual close both block new submissions without deleting previously accepted ones. A game does not auto-end when all submit.
8. Named winners, quotas, and append-only activity are visible to authorized game participants and update/reconcile reliably.
9. Local Docker and Vercel/Neon staging builds use the same business logic. Production performance is validated on production-like Docker infrastructure.
10. Completed games and their results cannot be reset or edited.

## 10. Risks and assumptions

- Cohort admins are responsible for the accuracy of package names/quotas and the separate academic schedule plan.
- Capacity must cover **all whitelisted students**, not only those who have already joined. Students who never submit may remain without a result; that does not imply the system ran out of capacity.
- FCFS is based on the **authoritative server/database acceptance order**, not a provable global ordering of clicks across different devices/network paths.
- A browser request that has not been accepted before the server cutoff is not eligible, even if the student clicked before the countdown reached zero.
- Any actual registration on the university portal is external to this product.
