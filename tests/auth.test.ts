import { test, after } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { getDb, closeDb } from "../db/client";
import { account, accountTokens, session, user } from "../db/schema";
import {
  activationEmail,
  consumeToken,
  importStudents,
  issueToken,
} from "../modules/accounts/service";
import { requireActor, adminOnly } from "../lib/authorization";
import { getAuth } from "../lib/auth";
import { actor } from "./helpers";
const password = "Fictional-only-password-2026!";
after(closeDb);
test("unknown users cannot self-register and unauthenticated access fails", async () => {
  await assert.rejects(requireActor(new Headers()), {
    code: "UNAUTHENTICATED",
  });
  const response = await getAuth().handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Fiksi",
        email: "unknown@example.invalid",
        password,
      }),
    }),
  );
  assert.ok(response.status >= 400);
});
test("admin import normalizes and preserves existing accounts; invalid rows and duplicates reported", async () => {
  const admin = await actor("ADMIN");
  const id = crypto.randomUUID();
  const csv = `name,email\nFiksi,${id.toUpperCase()}@EXAMPLE.INVALID\nUbah,${id}@example.invalid\nTidak Valid,bukan-email`;
  const rows = await importStudents(admin, csv);
  assert.deepEqual(
    rows.map((r) => r.status),
    ["inserted", "duplicate", "invalid"],
  );
  const again = await importStudents(admin, csv);
  assert.equal(again[0].status, "existing");
  const [saved] = await getDb()
    .select()
    .from(user)
    .where(eq(user.email, `${id}@example.invalid`));
  assert.equal(saved.name, "Fiksi");
  assert.throws(() => adminOnly({ id: "x", name: "x", role: "STUDENT" }), {
    code: "FORBIDDEN",
  });
  await assert.rejects(importStudents(await actor(), csv), {
    code: "FORBIDDEN",
  });
});
test("activation is hashed, single use even concurrently, and allows library login", async () => {
  const student = await actor("STUDENT", false);
  const token = await issueToken(student.id, "ACTIVATION");
  const [stored] = await getDb()
    .select()
    .from(accountTokens)
    .where(eq(accountTokens.userId, student.id));
  assert.notEqual(stored.tokenHash, token);
  const results = await Promise.allSettled([
    consumeToken(token, password, "ACTIVATION"),
    consumeToken(token, password, "ACTIVATION"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const [credential] = await getDb()
    .select()
    .from(account)
    .where(eq(account.userId, student.id));
  assert.ok(credential.password);
  assert.ok(await verifyPassword({ hash: credential.password, password }));
  const [current] = await getDb()
    .select()
    .from(user)
    .where(eq(user.id, student.id));
  const response = await getAuth().handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: current.email, password }),
    }),
  );
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("set-cookie"));
});
test("expired tokens, wrong purpose and replay rejected; reset revokes sessions", async () => {
  const student = await actor("STUDENT", false);
  const expired = await issueToken(student.id, "ACTIVATION");
  await getDb()
    .update(accountTokens)
    .set({ expiresAt: sql`clock_timestamp() - interval '1 second'` })
    .where(eq(accountTokens.userId, student.id));
  await assert.rejects(consumeToken(expired, password, "ACTIVATION"), {
    code: "INVALID_TOKEN",
  });
  const token = await issueToken(student.id, "ACTIVATION");
  await assert.rejects(consumeToken(token, password, "PASSWORD_RESET"), {
    code: "INVALID_TOKEN",
  });
  await consumeToken(token, password, "ACTIVATION");
  await getDb()
    .insert(session)
    .values({
      id: crypto.randomUUID(),
      userId: student.id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 60000),
    });
  const reset = await issueToken(student.id, "PASSWORD_RESET");
  await consumeToken(reset, password + "new", "PASSWORD_RESET");
  await assert.rejects(consumeToken(reset, password, "PASSWORD_RESET"), {
    code: "INVALID_TOKEN",
  });
  assert.equal(
    (await getDb().select().from(session).where(eq(session.userId, student.id)))
      .length,
    0,
  );
});
test("email disabled safely and resend invalidates old link", async () => {
  const admin = await actor("ADMIN");
  const student = await actor("STUDENT", false);
  await assert.rejects(activationEmail(admin, student.id), {
    code: "EMAIL_DISABLED",
  });
  const first = await issueToken(student.id, "ACTIVATION");
  const second = await issueToken(student.id, "ACTIVATION");
  await assert.rejects(consumeToken(first, password, "ACTIVATION"), {
    code: "INVALID_TOKEN",
  });
  await consumeToken(second, password, "ACTIVATION");
});
