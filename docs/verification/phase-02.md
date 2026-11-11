# Phase 02 verification

PASS on PostgreSQL 17.7 container (loopback-only isolated `war_krs_test`), Node 22:
- Migrations and read-only connectivity probe.
- Five database-backed auth/security tests: public signup/unauthenticated denial,
  normalized import/duplicates/wrong role, concurrent single-use activation and
  Better Auth login, expired/wrong-purpose/replayed tokens, password reset session
  revocation, resend invalidation and safe disabled email mode.
- Typecheck, ESLint, production build without DB/auth/email build secrets.

Implementation: Better Auth 1.7.20 database sessions and its maintained scrypt
password default; Drizzle schema/migration; explicit admin bootstrap; safe CSV
preview/import; admin/student server guards; Origin validation; DB rate limits;
activation/login/logout/recovery UI using official shadcn primitives.

NOT VERIFIED: live Resend delivery, HTTPS production cookie delivery, external
hosting. No provider credentials or real recipients were supplied. Initial npm
network timeout was resolved by retrying the install; checks then passed.
