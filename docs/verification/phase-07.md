# Phase 07 verification

Browser verification uses real Chromium, production Next.js server and PostgreSQL.
Eight end-to-end scenarios cover activation/login/role guards; student join,
all-package sequential ranking/reorder/submit/reload, winners and event logs at
320/375/768/1440px; Upcoming no-ranking; Completed history; offline/online recovery;
keyboard tabs; admin Draft edit/save and confirmed End War; two simultaneous
browsers, canonical snapshots, actual SSE bytes and direct API role/CSRF rejection.
Axe checks WCAG 2 A/AA and 2.1 AA on forms, waiting/results, dialogs and admin setup.
Screenshots were inspected at 320px; no page horizontal overflow at tested widths.

Polish includes larger touch targets, stronger destructive color contrast, Indonesian
loading/error/404 and dialog-close copy, reduced-motion support, readable source
formatting and safe winner refresh/pagination. Found/fixed the offline synchronous
failure holding the request latch; authorization now precedes admin input parsing.
A deactivated session redirects to login instead of looping on the game page.
Initial test failures and their fixes are retained in the narrative, not hidden:
contrast at dialog transition, destructive-button contrast, offline recovery, and
an ambiguous status locator in the browser test. Fixtures were regenerated for reruns.

The accumulated test database contained nearly 4,000 fictional accounts. Rendering
all whitelist checkboxes caused browser checks to exceed their time budget. The
editor now renders 100 matches at a time with an explicit load-more control while
search and Select All still use the full eligible list. Draft edits no longer issue
redundant same-route navigation; manual close refreshes its canonical live snapshot.

Final PASS: all eight browser scenarios (22.6 seconds), including axe checks with
zero reported violations and all four overflow checks. The 22 database-backed
regression tests also passed. Typecheck, lint and production build passed.
