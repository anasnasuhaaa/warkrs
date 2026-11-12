import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { games, packages, participants } from "@/db/schema";
import { Actor } from "@/lib/authorization";
import { invariant } from "@/lib/errors";
import { reconcileGame } from "./lifecycle";
import { effectiveStatus } from "./status";
export async function gameDetail(actor: Actor, id: string) {
  const [game] = await getDb().select().from(games).where(eq(games.id, id));
  invariant(game, "NOT_FOUND", "War tidak ditemukan.", 404);
  const [member] = await getDb()
    .select()
    .from(participants)
    .where(and(eq(participants.gameId, id), eq(participants.userId, actor.id)));
  invariant(
    actor.role === "ADMIN" || (member && game.publishedAt),
    "FORBIDDEN",
    "Akses War tidak tersedia.",
    403,
  );
  await reconcileGame(id);
  const [fresh] = await getDb().select().from(games).where(eq(games.id, id));
  invariant(fresh, "NOT_FOUND", "War tidak ditemukan.", 404);
  const clock = await getDb().execute(sql`select clock_timestamp() as now`);
  const serverNow = new Date(clock.rows[0].now as string);
  const ps = await getDb()
    .select({
      id: packages.id,
      name: packages.name,
      capacity: packages.capacity,
    })
    .from(packages)
    .where(eq(packages.gameId, id))
    .orderBy(packages.createdAt, packages.id);
  return {
    id: game.id,
    title: game.title,
    termsText: game.termsText,
    termsVersion: game.termsVersion,
    startsAt: game.startsAt,
    endsAt: game.endsAt,
    status: effectiveStatus(fresh, serverNow),
    serverNow,
    joinedAt: member?.joinedAt ?? null,
    packages: ps,
  };
}
