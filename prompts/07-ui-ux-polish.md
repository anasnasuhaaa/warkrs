# Phase 07 — Responsive UI/UX Refinement

## Read first

`AGENTS.md`, `docs/PRD.md`, `docs/BUSINESS_RULES.md`, existing design system and implemented app pages.

## Objective

Polish the existing functional experience rather than redesigning it or adding unrelated features. The primary user is a student using a phone during a timed war.

## Tasks

1. Audit admin and student flows: login/activation, eligible game list, Upcoming waiting room/countdown, join+terms, Live one-tap ranking, authoritative result, package winners, event log, admin game setup/whitelist/monitor/end, Completed history.
2. Use **official shadcn/ui** components as the foundation. Improve spacing, type hierarchy, color contrast, form accessibility, feedback, active states and responsive tables. Do not replace installed shadcn primitives with handwritten clones.
3. Make ranking fast: large touch targets; prevent duplicate selection visually; easy remove/change before submit; disable button until all ranked; show honest loading/submitting/reconnect states. Avoid unnecessary confirmation dialogs during the timed flow.
4. Make the interface responsive at **320, 375, 768 and 1440px** and usable with keyboard and screen reader. Preserve simple UI copy in **Bahasa Indonesia**.
5. Admin dashboard should make whitelist vs joined vs submitted vs allocated counts distinct; show zero states, errors and immutable/published badges clearly.
6. Realtime logs should not jump unexpectedly, cause layout reflow, or hide old entries; keep navigation quick.
7. Improve small UX details without changing database, allocation ordering, authorization or agreed behavior. No new feature modules; only small bug fixes discovered during polish.

## Acceptance criteria

- Full critical student path usable on a narrow phone without horizontal overflow.
- UI communicates authoritative states and errors without fabricated results.
- All key controls are accessible and built with shadcn/ui primitives.
- Existing functional tests still pass; no regression to consent/FCFS/live state.

## Verification and delivery

Run focused UI smoke tests/manual viewport checks, typecheck/lint/build. Commit locally as `style: refine responsive war experience`. **DO NOT PUSH.**
