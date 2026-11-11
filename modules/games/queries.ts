import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { Actor } from "@/lib/authorization";
import { reconcileGame } from "./lifecycle";
import { effectiveStatus } from "./status";
export async function listGames(actor: Actor) {
  const result = await getDb()
    .execute(sql`SELECT g.id,g.title,g.starts_at,g.ends_at,g.published_at,g.closed_at,g.completed_at,
    (SELECT count(*)::int FROM game_packages p WHERE p.game_id=g.id) AS package_count,
    (SELECT coalesce(sum(capacity),0)::int FROM game_packages p WHERE p.game_id=g.id) AS capacity,
    (SELECT count(*)::int FROM game_participants p WHERE p.game_id=g.id) AS whitelist_count,
    (SELECT joined_at FROM game_participants p WHERE p.game_id=g.id AND p.user_id=${actor.id}) AS joined_at,
    clock_timestamp() AS server_now
    FROM games g WHERE ${actor.role === "ADMIN"} OR (g.published_at IS NOT NULL AND EXISTS (SELECT 1 FROM game_participants p WHERE p.game_id=g.id AND p.user_id=${actor.id})) ORDER BY g.starts_at DESC`);
  for (const row of result.rows) {
    if (
      row.published_at &&
      !row.completed_at &&
      (row.closed_at ||
        new Date(row.server_now as string) >= new Date(row.ends_at as string))
    ) {
      await reconcileGame(String(row.id));
      row.completed_at = row.server_now;
    }
  }
  return result.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
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
