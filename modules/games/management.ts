import "server-only";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { games, auditLogs } from "@/db/schema";
import { adminOnly, type Actor } from "@/lib/authorization";
import { AppError, invariant } from "@/lib/errors";
import { deleteWarInput, visibilityInput } from "@/lib/game-validation";
import { lockGame } from "./lifecycle";
import { effectiveStatus } from "./status";

export async function setGameVisibility(actor: Actor, id: string, input: unknown) {
  adminOnly(actor);
  const value = visibilityInput.parse(input);
  return getDb().transaction(async (tx) => {
    const { game } = await lockGame(tx, id);
    invariant(game.publishedAt, "INVALID_STATUS", "Terbitkan War sebelum mengubah visibilitas.", 409);
    if (game.isHidden === value.isHidden) return { isHidden: game.isHidden };
    await tx.update(games).set({ isHidden: value.isHidden, updatedAt: sql`clock_timestamp()` }).where(eq(games.id, id));
    await tx.insert(auditLogs).values({ id: randomUUID(), adminId: actor.id, gameId: id, action: value.isHidden ? "GAME_HIDDEN" : "GAME_SHOWN" });
    return { isHidden: value.isHidden };
  });
}
export async function deleteWar(actor: Actor, id: string, input: unknown) {
  adminOnly(actor);
  const value = deleteWarInput.parse(input);
  try {
    return await getDb().transaction(async (tx) => {
      const { game, now } = await lockGame(tx, id);
      const status = effectiveStatus(game, now);
      invariant(status === "Draft" || status === "Upcoming" || status === "Completed", "UNSAFE_DELETION", "War Live atau Closing tidak dapat dihapus. Selesaikan War terlebih dahulu.", 409);
      invariant(value.confirmation === game.title, "INVALID_CONFIRMATION", "Judul konfirmasi tidak sesuai.");
      const deleted = await tx.execute(sql`SELECT public.delete_war_permanently(${id},${actor.id},${value.confirmation},${value.reason},${value.simulationConfirmed}) AS counts`);
      return { message: "War dan seluruh datanya telah dihapus permanen.", counts: deleted.rows[0].counts };
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
    if (cause instanceof Error && cause.message === "WAR_DELETE_UNSAFE")
      throw new AppError("UNSAFE_DELETION", "War belum aman untuk dihapus. Periksa status dan penyelesaian pengiriman.", 409);
    if (cause instanceof Error && cause.message === "WAR_DELETE_FORBIDDEN")
      throw new AppError("FORBIDDEN", "Akses khusus admin aktif.", 403);
    throw error;
  }
}
