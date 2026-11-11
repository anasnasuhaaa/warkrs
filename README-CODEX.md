# War KRS — Codex Implementation Package

**Purpose:** Implement a whitelist-only, first-come-first-served (FCFS) KRS package war system for one student cohort. The audience is students and administrators. The application UI must be in **Bahasa Indonesia**; the implementation instructions and technical documentation are in **English**.

## What this package is

- `AGENTS.md`: permanent repository instructions for Codex.
- `docs/PRD.md`: accessible product requirements for the team.
- `docs/BUSINESS_RULES.md`: authoritative decisions and invariants.
- `docs/ARCHITECTURE.md`: architecture and FCFS execution model.
- `docs/DATABASE.md`: proposed PostgreSQL schema and constraints.
- `docs/API_CONTRACTS.md`: endpoint behaviors and event contracts.
- `docs/DEPLOYMENT.md`: Vercel + Neon staging and Docker + PostgreSQL production.
- `prompts/01-...md` through `prompts/08-...md`: ordered Codex implementation phases.

## Starting point

The human developer will supply an **already initialized, Git-connected, otherwise bare `create-next-app` repository**. Do not initialize Git, create another Next.js app, or replace the repository. Inspect the actual Next.js version, package manager, existing directory structure, and scripts before modifying anything. Adapt proposed paths to the existing project; keep business contracts stable.

Copy `AGENTS.md`, `docs/`, and `prompts/` to the root of that existing repository. Optionally include this README. Do **not** copy the enclosing `war-krs-codex-package/` folder as an additional app directory.

## Recommended execution workflow

1. Start with `prompts/01-project-foundation.md`.
2. Ask Codex to read `AGENTS.md`, the relevant `docs/` files, and the current phase prompt.
3. Review the diff and focused verification results before advancing.
4. Codex creates **one local Git commit per completed phase**. **Only the human developer pushes.**
5. Continue sequentially through Phase 08. Each phase must preserve prior working behavior.

### Reusable command to Codex

```text
Read AGENTS.md and all referenced docs. Implement only prompts/01-project-foundation.md
against the current repository. Respect the existing Next.js/Git setup.
Run focused checks, create one local Conventional Commit if complete,
and DO NOT push. Summarize files changed, tests, and any remaining risks.
```

Replace the phase filename as you proceed. If Codex is given a previous partially completed phase, have it audit actual changes before claiming completion.

## Product decisions already finalized

- No public self-registration; accounts are pre-imported and activated by email.
- Admin whitelists students **per game**. Whitelisted students must **manually join** and accept the terms, including when the game is **Live**.
- A game can be created for simulations or for the actual KRS war. Each game has only package **names and quotas**—no course schedule model.
- Students may first select preferences only once the war is Live.
- All packages must be ranked exactly once; rank count equals the number of packages. There is **no admin field for priority count**.
- One submission per student per game; immutable once accepted. FCFS ordering is controlled by the server/database, not the device clock.
- Allocation falls through ranked packages until the first available package is found.
- Game ends at admin-set deadline unless an admin ends it early with a reason. It **never auto-ends merely because everyone submitted**.
- While Live, admin cannot edit game configuration, participants, packages, or quotas; the explicit **End War** action is the only operational exception.
- No reset of completed games, submissions, or results. Create a separate game for another simulation.
- Package occupancy, named winners, and event logs update live and are visible to authorized game participants, with an explicit notice in the join terms.
- Use real shadcn/ui components, not bespoke implementations of basic UI controls.

## One architectural refinement

For v1, prefer **short PostgreSQL transactions serialized per game**, which can accept, assign an authoritative order, and allocate in one atomic operation. This avoids a permanently running queue worker on Vercel. An internal worker may be introduced only after measurements justify it; it is not a prerequisite for this build. Read `docs/ARCHITECTURE.md` before changing this.

## Project boundary

This system organizes a **cohort-level agreement** about KRS packages. It does not interact with the university's official KRS system, reserve official university seats, or guarantee the university honors the outcome. The team must coordinate the actual campus KRS registration separately.

## Definition of done for the full project

All acceptance criteria in `docs/PRD.md` are implemented; transaction/concurrency tests prove no oversubscription or duplicate allocation; the application runs locally and with Docker; the staging build is compatible with Vercel + Neon; documentation includes deployment steps and operational limitations; the UI works on mobile, tablet, and desktop. External deployment and Git push remain manual.
