# War KRS event runbook

## Before the event

1. Verify HTTPS/DNS, exact `APP_BASE_URL`, NTP synchronization on host/DB, current
   app commit, `/api/health`, `/api/ready`, DB space, connection budget and backups.
   Rehearse restoration to an isolated database and reconcile counts.
2. Use distinct staging/production DBs and secrets. Verify migrations, administrator
   login and activation email delivery with explicitly approved test addresses.
   Confirm imported names/emails and account activation status with the cohort.
3. Rehearse the full student journey on phones. Run transaction and HTTP burst
   tests on dedicated fictional data, then a production-like monitoring/polling
   rehearsal. Do not run destructive seeds or load scripts against event data.
4. Create an independent game. Check WIB start/end, required terms, full-name
   disclosure, unique package names, positive quotas, exact whitelist and total
   capacity >= the entire whitelist. There is no priority-count setting.
5. Review saved Draft, then publish. Publication freezes schedule, terms, quotas,
   packages and whitelist. Make a backup. Do not promise later configuration edits.

## During the Zoom session

- Open the admin game monitor; distinguish whitelisted, joined, not joined,
  submitted and allocated. Explain joining is manual and allowed even during Live.
- Students must affirmatively accept terms. Ranking is available only during Live;
  every package must appear once. Explain server/database acceptance sequence,
  not device click time, decides order. A click is not confirmation.
- Watch remaining quota, fallback/success logs, connection status and CPU/RAM/DB
  connection waits. Winners/full names are visible only inside authorized views.
- If a browser loses the response, refresh/reconnect or use its own submission
  lookup. A committed allocation remains the same. Retrying never consumes a
  second seat. An unaccepted request after deadline cannot be backdated.
- All-submitted does not close a game. It stays Live until deadline/manual End War.

## Emergency End War

Only an admin may act during Live. Open **Akhiri war**, type a meaningful reason,
then confirm **Ya, akhiri war**. The shared game lock orders this operation against
submissions. New admissions stop; accepted results stay immutable. Record the
incident and communicate the server-confirmed state to participants.

## Outage and recovery

- If DB connectivity fails, stop making outcome claims; show reconnect/error
  feedback and investigate network, database health, disk, pool waits and runtime
  logs. Do not clear state, edit counters, reset results or change device timestamps.
- Restarting web/DB preserves outcomes in PostgreSQL. On recovery verify readiness,
  own results, quotas and append-only history. Scheduled deadlines still apply.
- Take an incident backup before repair. Restore a backup into a **new isolated DB**
  first; reconciliation must explain any gap. Never overwrite accepted live results
  as an ad-hoc repair. Keep the original DB/backup for audit and obtain a separately
  agreed incident procedure before any destructive production operation.
- A single-host power/network failure is outside application redundancy. Rehearse
  restoration and provide an operator contact; do not claim high availability.

## After the event

Confirm Completed state; reconcile one allocation per accepted submission, exact
rankings, occupancy counters vs allocation counts and no over-capacity packages.
Preserve results/events/audit data and make a restricted post-event backup. Export
or inspect identities only through authorized operator processes. Students still
register on the university KRS portal separately. For another simulation create a
new game; completed outcomes are never edited, deleted, reset or re-run in place.
