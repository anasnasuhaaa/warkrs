# Phase 06 — Realtime Quotas, Winners and Activity Logs

## Read first

`AGENTS.md`, `docs/PRD.md`, `docs/BUSINESS_RULES.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/DEPLOYMENT.md`. Inspect committed Phase 05 code, event schema and authorization.

## Objective

Provide trustworthy, readable near-real-time transparency during the war without relying on non-durable in-memory messages or a perpetual Vercel Function.

## Tasks

1. Implement authorized game snapshot/query endpoints for packages, capacity/allocated/remaining, winners' **full names**, own submission result and game state. Restrict participant identities to joined/authorized participants and admin; never expose emails/secrets.
2. Implement paginated append-only event feed with durable IDs/cursor. Show green allocation-success entries and amber 'priorities skipped because full' entries; use accurate server timestamps, ranked package references and submit sequence. No log event should claim a success before commit.
3. Build responsive student game tabs/sections **Main**, **Daftar Paket**, **Log Aktivitas**, using shadcn/ui Tabs, Card, Table, ScrollArea/Badge as appropriate. Click/open a package to see current winners with correct pagination. Build corresponding admin monitoring.
4. Create a shared client-side live-data abstraction: initial snapshot + incremental event cursor; reconnect/reload resynchronizes from database and avoids duplicate rows.
5. For **Vercel staging**, implement bounded polling (initially 3–5 seconds while Live) with backoff and visibility-aware behavior. Avoid wasteful requests when Completed.
6. For **Docker production**, implement authenticated SSE streaming **if supportable** with actual deployment architecture, heartbeats and replay cursor, backed by persisted events (not local-only event emitter). A graceful polling fallback is mandatory. Do not use an indefinite Vercel streaming function.
7. Handle network errors, stale state, repeated events, and fast burst updates without freezing mobile UI. Show a subtle reconnect/stale indicator; never show speculative allocation as confirmed.
8. Make full-name visibility and log transparency clear in consent terms; redact sensitive fields.

## Out of scope

No WebSocket server, Redis pub/sub, external realtime service, reset, or changes to FCFS business logic.

## Acceptance criteria

- After two students submit, both participants see the same authoritative package counts and event history after update/reload.
- Reconnect does not lose events or double-render already seen events.
- Permission checks prevent unauthenticated/unwhitelisted log enumeration.
- Realtime mechanism works on Vercel staging with polling and on self-hosted deployment with SSE or safe fallback; differences are documented.

## Verification and delivery

Use focused feed/reconnect/auth tests, typecheck/lint/build, and at least one simultaneous client scenario. One local commit such as `feat(realtime): add live quotas and audit feed`. **DO NOT PUSH.**
