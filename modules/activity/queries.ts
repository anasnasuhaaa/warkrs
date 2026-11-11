import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { games, packages } from "@/db/schema";
import { Actor } from "@/lib/authorization";
import { invariant } from "@/lib/errors";
import { activeMember, type Transaction } from "@/modules/games/lifecycle";
import { gameDetail } from "@/modules/games/detail";
import { effectiveStatus } from "@/modules/games/status";
export async function feedAccess(tx: Transaction, actor: Actor, id: string) {
  const [game] = await tx.select().from(games).where(eq(games.id, id));
  invariant(game, "NOT_FOUND", "Game tidak ditemukan.", 404);
  if (actor.role !== "ADMIN") {
    const member = await activeMember(tx, actor, id);
    invariant(
      game.publishedAt && member.joinedAt,
      "FORBIDDEN",
      "Bergabung terlebih dahulu untuk melihat hasil dan aktivitas.",
      403,
    );
  }
  return game;
}
export async function snapshot(actor: Actor, id: string) {
  await gameDetail(actor, id); // Authorized scheduled reconciliation before read-only snapshot.
  return getDb().transaction(
    async (tx) => {
      const game = await feedAccess(tx, actor, id);
      const rows = await tx
        .select({
          id: packages.id,
          name: packages.name,
          capacity: packages.capacity,
          allocated: packages.allocatedCount,
        })
        .from(packages)
        .where(eq(packages.gameId, id))
        .orderBy(packages.createdAt, packages.id);
      const counts = await tx.execute(sql`SELECT
   (SELECT count(*)::int FROM game_participants WHERE game_id=${id}) AS whitelisted,
   (SELECT count(*)::int FROM game_participants WHERE game_id=${id} AND joined_at IS NOT NULL) AS joined,
   (SELECT count(*)::int FROM war_submissions WHERE game_id=${id}) AS submitted,
   (SELECT count(*)::int FROM war_allocations WHERE game_id=${id}) AS allocated,
   (SELECT coalesce(max(event_id),0)::text FROM war_events WHERE game_id=${id}) AS cursor,
   clock_timestamp() AS now`);
      const c = counts.rows[0];
      const now = new Date(c.now as string);
      const member =
        actor.role === "ADMIN" ? null : await activeMember(tx, actor, id);
      const own = await tx.execute(
        sql`SELECT s.id AS "submissionId",s.sequence,s.accepted_at AS "acceptedAt",a.package_id AS "packageId",p.name AS "packageName",a.awarded_rank AS "awardedRank" FROM war_submissions s JOIN war_allocations a ON a.submission_id=s.id JOIN game_packages p ON p.id=a.package_id WHERE s.game_id=${id} AND s.user_id=${actor.id}`,
      );
      const r = own.rows[0];
      return {
        game: {
          id: game.id,
          title: game.title,
          termsText: game.termsText,
          termsVersion: game.termsVersion,
          startsAt: game.startsAt,
          endsAt: game.endsAt,
          serverNow: now,
          status: effectiveStatus(game, now),
          joinedAt: member?.joinedAt ?? null,
          packages: rows.map((p) => ({
            id: p.id,
            name: p.name,
            capacity: p.capacity,
          })),
        },
        packages: rows.map((p) => ({
          ...p,
          remaining: p.capacity - p.allocated,
        })),
        counts: {
          whitelisted: Number(c.whitelisted),
          joined: Number(c.joined),
          notJoined: Number(c.whitelisted) - Number(c.joined),
          submitted: Number(c.submitted),
          allocated: Number(c.allocated),
        },
        cursor: String(c.cursor),
        ownSubmission: r
          ? {
              submissionId: r.submissionId,
              sequence: r.sequence,
              acceptedAt: r.acceptedAt,
              allocation: {
                packageId: r.packageId,
                packageName: r.packageName,
                awardedRank: r.awardedRank,
              },
            }
          : null,
        realtimeMode:
          process.env.REALTIME_MODE === "sse" && !process.env.VERCEL
            ? "sse"
            : "polling",
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
export const cursorSchema = z
  .string()
  .regex(/^\d{1,18}$/)
  .default("0");
export async function eventFeed(
  actor: Actor,
  id: string,
  after = "0",
  limit = 100,
) {
  cursorSchema.parse(after);
  z.number().int().min(1).max(200).parse(limit);
  return getDb().transaction(
    async (tx) => {
      await feedAccess(tx, actor, id);
      const r = await tx.execute(
        sql`SELECT e.event_id::text AS id,e.event_type AS type,e.created_at AS "createdAt",u.full_name AS "actorName",p.name AS "packageName",e.rank,e.sequence FROM war_events e LEFT JOIN users u ON u.id=e.actor_user_id LEFT JOIN game_packages p ON p.id=e.package_id WHERE e.game_id=${id} AND e.event_id>${after}::bigint ORDER BY e.event_id LIMIT ${limit + 1}`,
      );
      const items = r.rows.slice(0, limit);
      return {
        items,
        cursor: items.length ? String(items[items.length - 1].id) : after,
        hasMore: r.rows.length > limit,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
export async function packageWinners(
  actor: Actor,
  id: string,
  packageId: string,
  afterSequence = 0,
  limit = 50,
) {
  z.number().int().min(0).max(2147483647).parse(afterSequence);
  z.number().int().min(1).max(100).parse(limit);
  return getDb().transaction(
    async (tx) => {
      await feedAccess(tx, actor, id);
      const [p] = await tx
        .select({ id: packages.id })
        .from(packages)
        .where(and(eq(packages.id, packageId), eq(packages.gameId, id)));
      const r = await tx.execute(
        sql`SELECT u.full_name AS name,s.sequence,a.awarded_rank AS "awardedRank",a.allocated_at AS "allocatedAt" FROM war_allocations a JOIN users u ON u.id=a.user_id JOIN war_submissions s ON s.id=a.submission_id WHERE a.game_id=${id} AND a.package_id=${packageId} AND s.sequence>${afterSequence} ORDER BY s.sequence LIMIT ${limit + 1}`,
      );
      invariant(p, "NOT_FOUND", "Paket tidak ditemukan.", 404);
      const items = r.rows.slice(0, limit);
      return {
        items,
        cursor: items.length
          ? Number(items[items.length - 1].sequence)
          : afterSequence,
        hasMore: r.rows.length > limit,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
