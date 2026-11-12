import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { Resend } from "resend";
import { z } from "zod";
import { getDb } from "@/db/client";
import { account, accountTokens, session, user } from "@/db/schema";
import { Actor, adminOnly } from "@/lib/authorization";
import { invariant } from "@/lib/errors";
import { readAppUrl } from "@/lib/config";
import { accountEmail } from "./email";
import { limit } from "@/lib/rate-limit";

import { passwordSchema, emailSchema } from "@/lib/account-validation";
export {
  importStudents,
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from "./students";

const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function issueToken(
  userId: string,
  purpose: "ACTIVATION" | "PASSWORD_RESET",
  expectedEmail?: string,
) {
  const token = randomBytes(32).toString("base64url");
  await getDb().transaction(async (tx) => {
    // Same user lock as token consumption, serializes resend and consumption.
    await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
    const [current] = await tx.select().from(user).where(eq(user.id, userId));
    invariant(
      current && (!expectedEmail || current.email === expectedEmail),
      "ACCOUNT_CHANGED",
      "Akun berubah. Muat ulang dan coba kembali.",
      409,
    );
    invariant(
      purpose !== "PASSWORD_RESET" || current.emailVerified,
      "INVALID_TOKEN",
      "Akun belum aktif.",
    );
    await tx
      .update(accountTokens)
      .set({ consumedAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(accountTokens.userId, userId),
          eq(accountTokens.purpose, purpose),
          isNull(accountTokens.consumedAt),
        ),
      );
    await tx.insert(accountTokens).values({
      id: randomUUID(),
      userId,
      purpose,
      tokenHash: digest(token),
      expiresAt: sql`clock_timestamp() + interval '1 hour'`,
    });
  });
  return token;
}
export async function consumeToken(
  token: string,
  password: string,
  purpose: "ACTIVATION" | "PASSWORD_RESET",
) {
  z.string().min(40).max(100).parse(token);
  passwordSchema.parse(password);
  await limit(`token:${digest(token)}`, 8);
  const passwordHash = await hashPassword(password); // Slow hashing outside transaction.
  return getDb().transaction(async (tx) => {
    const [candidate] = await tx
      .select({ userId: accountTokens.userId })
      .from(accountTokens)
      .where(eq(accountTokens.tokenHash, digest(token)));
    invariant(
      candidate,
      "INVALID_TOKEN",
      "Tautan tidak valid atau kedaluwarsa.",
    );
    await tx.execute(
      sql`SELECT id FROM users WHERE id = ${candidate.userId} FOR UPDATE`,
    );
    const consumed =
      await tx.execute(sql`UPDATE account_tokens SET consumed_at = clock_timestamp()
      WHERE token_hash = ${digest(token)} AND purpose = ${purpose} AND consumed_at IS NULL AND expires_at > clock_timestamp() RETURNING user_id`);
    invariant(
      consumed.rows.length === 1,
      "INVALID_TOKEN",
      "Tautan tidak valid atau kedaluwarsa.",
    );
    const userId = candidate.userId;
    const [current] = await tx.select().from(user).where(eq(user.id, userId));
    invariant(
      purpose !== "ACTIVATION" || !current.emailVerified,
      "INVALID_TOKEN",
      "Akun sudah diaktifkan.",
    );
    await tx
      .insert(account)
      .values({
        id: randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
      })
      .onConflictDoUpdate({
        target: [account.providerId, account.accountId],
        set: { password: passwordHash, updatedAt: sql`clock_timestamp()` },
      });
    await tx
      .update(user)
      .set({ emailVerified: true, updatedAt: sql`clock_timestamp()` })
      .where(eq(user.id, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    return { message: "Kata sandi tersimpan. Silakan masuk." };
  });
}
async function sendLink(
  email: string,
  token: string,
  purpose: "ACTIVATION" | "PASSWORD_RESET",
  name?: string,
) {
  invariant(
    process.env.EMAIL_MODE === "resend",
    "EMAIL_DISABLED",
    "Pengiriman email belum diaktifkan. Hubungi pengelola.",
    503,
  );
  invariant(
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM,
    "EMAIL_CONFIGURATION",
    "Konfigurasi email belum lengkap.",
    503,
  );
  const url = new URL(
    purpose === "ACTIVATION" ? "/activate" : "/reset-password",
    readAppUrl(),
  );
  url.hash = token; // Fragment keeps token out of access logs and Referer headers.
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    ...accountEmail(purpose, url.toString(), name),
  });
  invariant(
    !error,
    "EMAIL_FAILED",
    "Email gagal dikirim. Silakan coba kembali.",
    503,
  );
}
export async function activationEmail(actor: Actor, id: string) {
  adminOnly(actor);
  await limit(`activation:${actor.id}`, 30);
  const [student] = await getDb().select().from(user).where(eq(user.id, id));
  invariant(
    student && student.role === "STUDENT" && !student.emailVerified,
    "INVALID_INPUT",
    "Akun tidak ditemukan atau sudah aktif.",
  );
  // Check mode before issuing a token. Never print or return raw token.
  invariant(
    process.env.EMAIL_MODE === "resend",
    "EMAIL_DISABLED",
    "Pengiriman email belum diaktifkan.",
    503,
  );
  await limit(`email:${id}`, 3, 3600);
  const token = await issueToken(id, "ACTIVATION", student.email);
  await sendLink(student.email, token, "ACTIVATION", student.name);
  return { message: "Email aktivasi dikirim." };
}
export async function requestReset(emailInput: string) {
  const email = emailSchema.parse(emailInput);
  await limit(`reset:${email}`, 3, 3600);
  invariant(
    process.env.EMAIL_MODE === "resend",
    "EMAIL_DISABLED",
    "Pengiriman email belum diaktifkan. Hubungi pengelola.",
    503,
  );
  const [current] = await getDb()
    .select()
    .from(user)
    .where(and(eq(user.email, email), eq(user.emailVerified, true)));
  if (current)
    await sendLink(
      email,
      await issueToken(current.id, "PASSWORD_RESET", email),
      "PASSWORD_RESET",
      current.name,
    );
  return {
    message: "Jika akun aktif ditemukan, tautan pemulihan akan dikirim.",
  };
}
