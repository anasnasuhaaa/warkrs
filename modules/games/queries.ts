import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { AppError } from "@/lib/errors";
import { Actor } from "@/lib/authorization";
import { reconcileGame } from "./lifecycle";
import { effectiveStatus } from "./status";
export async function listGames(actor: Actor) {
  const result = await getDb()
    .execute(sql`SELECT g.id,g.title,g.is_hidden,g.starts_at,g.ends_at,g.published_at,g.closed_at,g.completed_at,
    (SELECT count(*)::int FROM game_packages p WHERE p.game_id=g.id) AS package_count,
    (SELECT coalesce(sum(capacity),0)::int FROM game_packages p WHERE p.game_id=g.id) AS capacity,
    (SELECT count(*)::int FROM game_participants p WHERE p.game_id=g.id) AS whitelist_count,
    (SELECT joined_at FROM game_participants p WHERE p.game_id=g.id AND p.user_id=${actor.id}) AS joined_at,
    clock_timestamp() AS server_now
    FROM games g WHERE ${actor.role === "ADMIN"} OR (NOT g.is_hidden AND g.published_at IS NOT NULL AND EXISTS (SELECT 1 FROM game_participants p WHERE p.game_id=g.id AND p.user_id=${actor.id})) ORDER BY g.starts_at DESC`);
  const deleted = new Set<string>();
  for (const row of result.rows) {
    if (
      row.published_at &&
      !row.completed_at &&
      (row.closed_at ||
        new Date(row.server_now as string) >= new Date(row.ends_at as string))
    ) {
      try { await reconcileGame(String(row.id)); }
      catch (error) {
        if (error instanceof AppError && error.status === 404) { deleted.add(String(row.id)); continue; }
        throw error;
      }
      row.completed_at = row.server_now;
    }
  }
  return result.rows.filter(r => !deleted.has(String(r.id))).map((r) => ({
    id: String(r.id),
    title: String(r.title),
    isHidden: Boolean(r.is_hidden),
    startsAt: new Date(r.starts_at as string),
    endsAt: new Date(r.ends_at as string),
    joinedAt: r.joined_at ? new Date(r.joined_at as string) : null,
    packageCount: Number(r.package_count),
    capacity: Number(r.capacity),
    whitelistCount: Number(r.whitelist_count),
    status: effectiveStatus(
      {
        publishedAt: r.published_at as Date | null,
        startsAt: new Date(r.starts_at as string),
        endsAt: new Date(r.ends_at as string),
        closedAt: r.closed_at as Date | null,
        completedAt: r.completed_at as Date | null,
      },
      new Date(r.server_now as string),
    ),
  }));
}
