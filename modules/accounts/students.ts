import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { account, accountTokens, auditLogs, session, user } from "@/db/schema";
import { Actor, adminOnly } from "@/lib/authorization";
import { studentInput } from "@/lib/account-validation";
import { AppError, invariant } from "@/lib/errors";
import { limit } from "@/lib/rate-limit";
import { parseStudentsExcel } from "./excel";

function databaseError(error: unknown): { code?: string; constraint?: string } {
  if (!error || typeof error !== "object") return {};
  if ("code" in error) return error as { code: string; constraint?: string };
  return "cause" in error ? databaseError(error.cause) : {};
}
function conflict(error: unknown): never {
  const pg = databaseError(error);
  if (pg.code === "23505")
    throw new AppError(
      "STUDENT_CONFLICT",
      pg.constraint === "users_student_nim_unique"
        ? "NIM sudah digunakan mahasiswa lain."
        : "Email sudah digunakan akun lain.",
      409,
    );
  if (pg.code === "23503")
    throw new AppError(
      "STUDENT_PROTECTED",
      "Mahasiswa memiliki relasi atau riwayat War dan tidak dapat dihapus.",
      409,
    );
  throw error;
}
function input(value: unknown) {
  const parsed = studentInput.safeParse(value);
  if (!parsed.success)
    throw new AppError(
      "INVALID_INPUT",
      parsed.error.issues.map((i) => i.message).join(" "),
    );
  return parsed.data;
}
export async function createStudent(actor: Actor, value: unknown) {
  adminOnly(actor);
  const fields = input(value);
  try {
    return await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(user)
        .values({
          id: randomUUID(),
          ...fields,
          role: "STUDENT",
          emailVerified: false,
        })
        .returning({ id: user.id });
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        adminId: actor.id,
        action: "STUDENT_CREATED",
        metadata: JSON.stringify({ studentId: created.id }),
      });
      return {
        ...created,
        message: "Mahasiswa ditambahkan. Akun belum aktif.",
      };
    });
  } catch (e) {
    conflict(e);
  }
}
export async function updateStudent(actor: Actor, id: string, value: unknown) {
  adminOnly(actor);
  const fields = input(value);
  try {
    return await getDb().transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(user)
        .where(eq(user.id, id))
        .for("update");
      invariant(
        current?.role === "STUDENT",
        "NOT_FOUND",
        "Mahasiswa tidak ditemukan.",
        404,
      );
      const emailChanged = fields.email !== current.email;
      await tx
        .update(user)
        .set({
          ...fields,
          ...(emailChanged ? { emailVerified: false } : {}),
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(user.id, id));
      if (emailChanged) {
        await tx.delete(session).where(eq(session.userId, id));
        await tx
          .update(account)
          .set({ password: null, updatedAt: sql`clock_timestamp()` })
          .where(eq(account.userId, id));
        await tx
          .update(accountTokens)
          .set({ consumedAt: sql`clock_timestamp()` })
          .where(eq(accountTokens.userId, id));
      }
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        adminId: actor.id,
        action: "STUDENT_UPDATED",
        metadata: JSON.stringify({ studentId: id, emailChanged }),
      });
      return {
        id,
        emailChanged,
        message: emailChanged
          ? "Mahasiswa diperbarui. Sesi dan tautan lama dicabut; kirim aktivasi ke email baru."
          : "Mahasiswa diperbarui.",
      };
    });
  } catch (e) {
    conflict(e);
  }
}
export async function deleteStudent(actor: Actor, id: string) {
  adminOnly(actor);
  try {
    return await getDb().transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(user)
        .where(eq(user.id, id))
        .for("update");
      invariant(
        current?.role === "STUDENT",
        "NOT_FOUND",
        "Mahasiswa tidak ditemukan.",
        404,
      );
      const refs = await tx.execute(sql`SELECT
        EXISTS(SELECT 1 FROM game_participants WHERE user_id=${id} OR whitelisted_by=${id}) OR
        EXISTS(SELECT 1 FROM games WHERE created_by=${id} OR closed_by=${id}) OR
        EXISTS(SELECT 1 FROM war_submissions WHERE user_id=${id}) OR
        EXISTS(SELECT 1 FROM war_events WHERE actor_user_id=${id}) OR
        EXISTS(SELECT 1 FROM admin_audit_logs WHERE admin_user_id=${id}) AS protected`);
      invariant(
        !refs.rows[0].protected,
        "STUDENT_PROTECTED",
        "Mahasiswa tercantum dalam daftar peserta atau riwayat War. Hapus dari draf terlebih dahulu; riwayat War yang dipublikasikan tetap dilindungi.",
        409,
      );
      await tx.delete(accountTokens).where(eq(accountTokens.userId, id));
      await tx.delete(user).where(eq(user.id, id)); // Only auth sessions/credentials cascade.
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        adminId: actor.id,
        action: "STUDENT_DELETED",
        metadata: JSON.stringify({ studentId: id }),
      });
      return { id, message: "Mahasiswa dihapus." };
    });
  } catch (e) {
    conflict(e);
  }
}
export async function importStudents(
  actor: Actor,
  buffer: Buffer,
  filename: string,
) {
  adminOnly(actor);
  await limit(`import:${actor.id}`, 10);
  const rows = await parseStudentsExcel(buffer, filename);
  return getDb().transaction(async (tx) => {
    // Admin batches can contain the same identities in different row orders.
    // Serialize imports in PostgreSQL to prevent opposite-order unique-key
    // waits from deadlocking; the unique indexes also cover manual mutations.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(410202)`);
    for (const row of rows) {
      if (row.status !== "valid") continue;
      const inserted = await tx
        .insert(user)
        .values({
          id: randomUUID(),
          name: row.name,
          nim: row.nim,
          email: row.email,
          role: "STUDENT",
          emailVerified: false,
        })
        .onConflictDoNothing()
        .returning({ id: user.id });
      if (inserted.length) {
        row.status = "inserted";
        row.reason = "Mahasiswa ditambahkan; akun belum aktif.";
      } else {
        const existing = await tx
          .select({ email: user.email, nim: user.nim, role: user.role })
          .from(user)
          .where(
            or(
              eq(user.email, row.email),
              and(eq(user.nim, row.nim), eq(user.role, "STUDENT")),
            ),
          );
        row.status = "existing";
        row.reason =
          [
            existing.some((s) => s.email === row.email) &&
              "Email sudah terdaftar.",
            existing.some((s) => s.nim === row.nim && s.role === "STUDENT") &&
              "NIM sudah terdaftar.",
          ]
            .filter(Boolean)
            .join(" ") || "Data sudah terdaftar.";
      }
    }
    const summary = {
      total: rows.length,
      inserted: rows.filter((r) => r.status === "inserted").length,
      existing: rows.filter((r) => r.status === "existing").length,
      duplicate: rows.filter((r) => r.status === "duplicate").length,
      invalid: rows.filter((r) => r.status === "invalid").length,
    };
    await tx.insert(auditLogs).values({
      id: randomUUID(),
      adminId: actor.id,
      action: "STUDENTS_IMPORTED",
      metadata: JSON.stringify(summary),
    });
    return { rows, summary };
  });
}
export async function listStudents(actor: Actor) {
  adminOnly(actor);
  return getDb()
    .select({
      id: user.id,
      name: user.name,
      nim: user.nim,
      email: user.email,
      active: user.emailVerified,
    })
    .from(user)
    .where(eq(user.role, "STUDENT"))
    .orderBy(user.name);
}
