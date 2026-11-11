# Phase 08 — Reliability, Load Testing and Deployment Readiness

## Read first

`AGENTS.md`, all `docs/` including `docs/DEPLOYMENT.md`, existing Compose/Dockerfile and current scripts. Inspect actual code and previous commits.

## Objective

Complete an honest pre-release verification of the same application on local/Docker PostgreSQL and Vercel/Neon-compatible builds, without initiating production deployment, committing secrets or pushing to GitHub.

## Tasks

1. Audit required PRD acceptance criteria and add **targeted missing tests**, especially database transaction race tests, join during Live, deadline/End War contention, duplicate submit, fallback priority correctness and read-only Completed data.
2. Add reproducible load-test scripts (e.g., k6) with fictional test accounts and a safe setup guide. Simulate **200 concurrently active users** plus a **500-user** stress margin where practical. Record test environment and measured metrics rather than claiming unmeasured performance.
3. Verify one logical allocation engine and migration set run on PostgreSQL locally and are compatible with Neon transaction semantics. Ensure Vercel pathway has no always-running worker or permanent SSE dependency.
4. Verify Docker Compose web+Postgres startup, health checks, persistent database volume, reverse-proxy example/documentation, backup and restore commands, and sensible env injection. Do not expose database publicly.
5. Verify Next.js production build and document Vercel environment configuration for staging. Do not automatically connect accounts or deploy without credentials/approval; say clearly which checks could not be completed.
6. Check security: admin authorization, no public signup, token expiry/reuse, per-game access to full names/events, no secret in logs, robust error messages, basic rate limiting, and no client-time winner logic.
7. Document an event runbook: preflight checklist, open Zoom monitoring, participant join status, time sync, emergency End War, incident handling, backup/recovery and post-game reconciliation. No game reset.
8. Update `README-CODEX.md` or add an application README with local setup, migration, test, staging and Docker instructions. Keep it concise and accurate.

## Acceptance criteria

- Transaction/concurrency tests demonstrate no over-capacity or duplicate allocations on real PostgreSQL.
- App builds and operates in Docker locally; staging config is ready for Vercel + Neon without a separate codebase.
- Load-test commands and observations are reproducible; limitations are explicitly stated.
- No push, no production deployment, no imported real student data, and no secret committed.

## Delivery

Run relevant checks, provide concise release readiness report with PASS/FAIL/NOT VERIFIED and evidence. If incomplete, report blockers without claiming success. If complete, create one local commit such as `chore: prepare deployment and reliability checks`. **DO NOT PUSH.**
