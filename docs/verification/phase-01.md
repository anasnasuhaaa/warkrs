# Phase 01 verification

- Existing npm / root App Router preserved; Next 16.4.6, React 19.3.0,
  TypeScript 5.9.3, Tailwind 4.3.3, Node 22.22.1.
- Official shadcn CLI initialized the existing app with radix/nova; generated
  Button, Card, Badge. No handwritten replacement primitives.
- PASS: `npm run typecheck`, `npm run lint`, `npm run build` (no DB/email secrets).
- PASS: Compose configuration validation with placeholder values and ignored
  `.env.local`/`.env.production`; `.env.example` remains tracked.
- PASS: `db:check` fails closed with a safe message when configuration is missing.
- Database connectivity and Docker runtime verification will be recorded once
  the isolated PostgreSQL test image finishes downloading. No external deploy.
- Domain tables, authentication and real games intentionally start in later phases.
