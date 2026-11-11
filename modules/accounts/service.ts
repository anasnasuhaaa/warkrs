import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { parse } from "csv-parse/sync";
import { Resend } from "resend";
import { z } from "zod";
import { getDb } from "@/db/client";
import { account, accountTokens, session, user } from "@/db/schema";
import { Actor, adminOnly } from "@/lib/authorization";
import { AppError, invariant } from "@/lib/errors";
import { readAppUrl } from "@/lib/config";
import { limit } from "@/lib/rate-limit";

const emailSchema = z.email().max(254).transform((v) => v.trim().toLowerCase());
const passwordSchema = z.string().min(12).max(128);
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export function previewCsv(csv: string) {
  invariant(csv.length <= 200_000, "INVALID_INPUT", "Berkas maksimal 200 KB.");
  let records: Record<string, string>[];
  try { records = parse(csv, { columns: true, bom: true, trim: true, skip_empty_lines: true }); }
  catch { throw new AppError("INVALID_INPUT", "CSV tidak valid. Gunakan kolom name,email."); }
  invariant(records.length > 0 && records.length <= 1000, "INVALID_INPUT", "CSV harus berisi 1–1.000 baris dengan kolom name,email.");
  const seen = new Set<string>();
  return records.map((row, i) => {
    const name = (row.name ?? "").trim(); const email = (row.email ?? "").trim().toLowerCase();
    const valid = name.length > 0 && name.length <= 150 && emailSchema.safeParse(email).success;
    const duplicate = seen.has(email); seen.add(email);
    return { row: i + 2, name, email, status: !valid ? "invalid" : duplicate ? "duplicate" : "valid" };
  });
}
export async function importStudents(actor: Actor, csv: string, preview = false) {
  adminOnly(actor);
  const rows = previewCsv(csv);
  if (preview) {
    const existing = new Set((await getDb().select({ email: user.email }).from(user)).map((u) => u.email));
    return rows.map((r) => ({ ...r, status: r.status === "valid" && existing.has(r.email) ? "existing" : r.status }));
  }
  await limit(`import:${actor.id}`, 10);
  return getDb().transaction(async (tx) => {
    const result = [];
    for (const row of rows) {
      if (row.status !== "valid") { result.push(row); continue; }
      const inserted = await tx.insert(user).values({ id: randomUUID(), name: row.name, email: row.email }).onConflictDoNothing({ target: user.email }).returning({ id: user.id });
      result.push({ ...row, status: inserted.length ? "inserted" : "existing" });
    }
    return result;
  });
}
export async function listStudents(actor: Actor) {
  adminOnly(actor);
  return getDb().select({ id: user.id, name: user.name, email: user.email, active: user.emailVerified }).from(user).where(eq(user.role, "STUDENT")).orderBy(user.name);
}
export async function issueToken(userId: string, purpose: "ACTIVATION" | "PASSWORD_RESET") {
  const token = randomBytes(32).toString("base64url");
  await getDb().transaction(async (tx) => {
    // Same user lock as token consumption, serializes resend and consumption.
    await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
    await tx.update(accountTokens).set({ consumedAt: sql`clock_timestamp()` }).where(and(eq(accountTokens.userId, userId), eq(accountTokens.purpose, purpose), isNull(accountTokens.consumedAt)));
    await tx.insert(accountTokens).values({ id: randomUUID(), userId, purpose, tokenHash: digest(token), expiresAt: sql`clock_timestamp() + interval '1 hour'` });
  });
  return token;
}
export async function consumeToken(token: string, password: string, purpose: "ACTIVATION" | "PASSWORD_RESET") {
  z.string().min(40).max(100).parse(token); passwordSchema.parse(password);
  await limit(`token:${digest(token)}`, 8);
  const passwordHash = await hashPassword(password); // Slow hashing outside transaction.
  return getDb().transaction(async (tx) => {
    const [candidate] = await tx.select({ userId: accountTokens.userId }).from(accountTokens).where(eq(accountTokens.tokenHash, digest(token)));
    invariant(candidate, "INVALID_TOKEN", "Tautan tidak valid atau kedaluwarsa.");
    await tx.execute(sql`SELECT id FROM users WHERE id = ${candidate.userId} FOR UPDATE`);
    const consumed = await tx.execute(sql`UPDATE account_tokens SET consumed_at = clock_timestamp()
      WHERE token_hash = ${digest(token)} AND purpose = ${purpose} AND consumed_at IS NULL AND expires_at > clock_timestamp() RETURNING user_id`);
    invariant(consumed.rows.length === 1, "INVALID_TOKEN", "Tautan tidak valid atau kedaluwarsa.");
    const userId = candidate.userId;
    const [current] = await tx.select().from(user).where(eq(user.id, userId));
    invariant(purpose !== "ACTIVATION" || !current.emailVerified, "INVALID_TOKEN", "Akun sudah diaktifkan.");
    await tx.insert(account).values({ id: randomUUID(), userId, accountId: userId, providerId: "credential", password: passwordHash }).onConflictDoUpdate({ target: [account.providerId, account.accountId], set: { password: passwordHash, updatedAt: sql`clock_timestamp()` } });
    await tx.update(user).set({ emailVerified: true, updatedAt: sql`clock_timestamp()` }).where(eq(user.id, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    return { message: "Kata sandi tersimpan. Silakan masuk." };
  });
}
async function sendLink(email: string, token: string, purpose: "ACTIVATION" | "PASSWORD_RESET") {
  invariant(process.env.EMAIL_MODE === "resend", "EMAIL_DISABLED", "Pengiriman email belum diaktifkan. Hubungi pengelola.", 503);
  invariant(process.env.RESEND_API_KEY && process.env.EMAIL_FROM, "EMAIL_CONFIGURATION", "Konfigurasi email belum lengkap.", 503);
  const url = new URL(purpose === "ACTIVATION" ? "/activate" : "/reset-password", readAppUrl());
  url.hash = token; // Fragment keeps token out of access logs and Referer headers.
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.EMAIL_FROM, to: email,
    subject: purpose === "ACTIVATION" ? "Aktivasi akun War KRS" : "Pemulihan kata sandi War KRS",
    text: `Buka tautan berikut untuk mengatur kata sandi. Berlaku satu jam dan hanya dapat dipakai sekali.\n${url.toString()}\nAbaikan jika Anda tidak meminta tautan ini.`,
  });
  invariant(!error, "EMAIL_FAILED", "Email gagal dikirim. Silakan coba kembali.", 503);
}
export async function activationEmail(actor: Actor, id: string) {
  adminOnly(actor); await limit(`activation:${actor.id}`, 30);
  const [student] = await getDb().select().from(user).where(eq(user.id, id));
  invariant(student && student.role === "STUDENT" && !student.emailVerified, "INVALID_INPUT", "Akun tidak ditemukan atau sudah aktif.");
  // Check mode before issuing a token. Never print or return raw token.
  invariant(process.env.EMAIL_MODE === "resend", "EMAIL_DISABLED", "Pengiriman email belum diaktifkan.", 503);
  await limit(`email:${id}`, 3, 3600);
  const token = await issueToken(id, "ACTIVATION");
  await sendLink(student.email, token, "ACTIVATION");
  return { message: "Email aktivasi dikirim." };
}
export async function requestReset(emailInput: string) {
  const email = emailSchema.parse(emailInput.trim().toLowerCase());
  await limit(`reset:${email}`, 3, 3600);
  invariant(process.env.EMAIL_MODE === "resend", "EMAIL_DISABLED", "Pengiriman email belum diaktifkan. Hubungi pengelola.", 503);
  const [current] = await getDb().select().from(user).where(and(eq(user.email, email), eq(user.emailVerified, true)));
  if (current) await sendLink(email, await issueToken(current.id, "PASSWORD_RESET"), "PASSWORD_RESET");
  return { message: "Jika akun aktif ditemukan, tautan pemulihan akan dikirim." };
}
