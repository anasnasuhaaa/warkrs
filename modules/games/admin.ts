import "server-only";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs, games, packages, participants, user } from "@/db/schema";
import { Actor, adminOnly } from "@/lib/authorization";
import { nimConsentPrefix } from "./terms";
import { invariant } from "@/lib/errors";
import { draftInput, type DraftInput } from "@/lib/game-validation";
export { draftInput, type DraftInput } from "@/lib/game-validation";
function validateDraft(input: DraftInput) {
  const value = draftInput.parse(input);
  invariant(
    new Date(value.endsAt) > new Date(value.startsAt),
    "INVALID_DATES",
    "Waktu selesai harus setelah waktu mulai.",
  );
  invariant(
    new Set(value.packages.map((p) => p.name.normalize("NFKC").toLowerCase()))
      .size === value.packages.length,
    "DUPLICATE_PACKAGE",
    "Nama paket harus berbeda.",
  );
  invariant(
    new Set(value.userIds).size === value.userIds.length,
    "INVALID_INPUT",
    "Peserta tidak boleh duplikat.",
  );
  return value;
}
export async function saveDraft(
  actor: Actor,
  input: DraftInput,
  gameId?: string,
) {
  adminOnly(actor);
  const value = validateDraft(input);
  const id = gameId ?? randomUUID();
  return getDb().transaction(async (tx) => {
    if (gameId) {
      await tx.execute(sql`SELECT id FROM games WHERE id=${id} FOR UPDATE`);
      const [game] = await tx.select().from(games).where(eq(games.id, id));
      invariant(game, "NOT_FOUND", "War tidak ditemukan.", 404);
      invariant(
        !game.publishedAt,
        "CONFIGURATION_FROZEN",
        "War terbit tidak dapat diubah.",
        409,
      );
    }
    if (value.userIds.length) {
      const valid = await tx.execute(
        sql`SELECT id FROM users WHERE role='STUDENT' AND id IN (${sql.join(
          value.userIds.map((v) => sql`${v}`),
          sql`,`,
        )})`,
      );
      invariant(
        valid.rows.length === value.userIds.length,
        "INVALID_PARTICIPANT",
        "Daftar peserta berisi akun yang tidak sesuai.",
      );
    }
    const fields = {
      title: value.title,
      termsText: value.termsText,
      termsVersion: nimConsentPrefix + randomUUID(),
      startsAt: new Date(value.startsAt),
      endsAt: new Date(value.endsAt),
      updatedAt: sql`clock_timestamp()`,
    };
    if (gameId) {
      await tx.update(games).set(fields).where(eq(games.id, id));
      await tx.delete(packages).where(eq(packages.gameId, id));
      await tx.delete(participants).where(eq(participants.gameId, id));
    } else
      await tx.insert(games).values({ id, ...fields, createdBy: actor.id });
    if (value.packages.length)
      await tx
        .insert(packages)
        .values(
          value.packages.map((p) => ({
            id: randomUUID(),
            gameId: id,
            ...p,
            normalizedName: p.name.normalize("NFKC").toLowerCase(),
          })),
        );
    if (value.userIds.length)
      await tx
        .insert(participants)
        .values(
          value.userIds.map((userId) => ({
            gameId: id,
            userId,
            whitelistedBy: actor.id,
          })),
        );
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        adminId: actor.id,
        gameId: id,
        action: gameId ? "GAME_DRAFT_UPDATED" : "GAME_CREATED",
      });
    return { id };
  });
}
export async function getDraft(actor: Actor, id: string) {
  adminOnly(actor);
  const [game] = await getDb().select().from(games).where(eq(games.id, id));
  invariant(game, "NOT_FOUND", "War tidak ditemukan.", 404);
  const gamePackages = await getDb()
    .select()
    .from(packages)
    .where(eq(packages.gameId, id))
    .orderBy(packages.createdAt, packages.id);
  const whitelist = await getDb()
    .select({
      userId: participants.userId,
      joinedAt: participants.joinedAt,
      name: user.name,
    })
    .from(participants)
    .innerJoin(user, eq(user.id, participants.userId))
    .where(eq(participants.gameId, id));
  return { ...game, packages: gamePackages, whitelist };
}
export async function publishGame(actor: Actor, id: string) {
  adminOnly(actor);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM games WHERE id=${id} FOR UPDATE`);
    const [game] = await tx.select().from(games).where(eq(games.id, id));
    invariant(game, "NOT_FOUND", "War tidak ditemukan.", 404);
    invariant(
      !game.publishedAt,
      "CONFIGURATION_FROZEN",
      "War sudah diterbitkan.",
      409,
    );
    const result = await tx.execute(sql`SELECT clock_timestamp() AS now`);
    const now = new Date(result.rows[0].now as string);
    const ps = await tx.select().from(packages).where(eq(packages.gameId, id));
    const members = await tx
      .select()
      .from(participants)
      .where(eq(participants.gameId, id));
    invariant(
      game.title.trim() && game.termsText.trim(),
      "INVALID_INPUT",
      "Judul dan ketentuan wajib diisi.",
    );
    invariant(
      game.endsAt > game.startsAt && game.endsAt > now,
      "INVALID_DATES",
      "Jadwal War tidak valid atau sudah berakhir.",
    );
    invariant(
      ps.length > 0 && members.length > 0,
      "INVALID_INPUT",
      "Tambahkan minimal satu paket dan satu peserta.",
    );
    invariant(
      ps.reduce((sum, p) => sum + p.capacity, 0) >= members.length,
      "INSUFFICIENT_CAPACITY",
      "Total kuota harus mencakup seluruh daftar peserta.",
    );
    await tx
      .update(games)
      .set({
        termsVersion: game.termsVersion.startsWith(nimConsentPrefix) ? game.termsVersion : nimConsentPrefix + randomUUID(),
        publishedAt: sql`clock_timestamp()`,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(eq(games.id, id));
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        adminId: actor.id,
        gameId: id,
        action: "GAME_PUBLISHED",
      });
    return { id };
  });
}
