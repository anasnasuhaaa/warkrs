import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getDb, closeDb } from "../db/client";
import { sql } from "drizzle-orm";
import {
  snapshot,
  eventFeed,
  packageWinners,
} from "../modules/activity/queries";
import { submitRanking } from "../modules/allocation/service";
import { joinGame } from "../modules/games/lifecycle";
import { gameFixture } from "./fixtures";
import { actor } from "./helpers";
after(closeDb);
test("two simultaneous clients converge on snapshots and durable events, identities only after join", async () => {
  const f = await gameFixture({ count: 3, capacities: [1, 2], join: false });
  await assert.rejects(snapshot(f.students[0], f.id), { code: "FORBIDDEN" });
  await assert.rejects(eventFeed(f.students[0], f.id), { code: "FORBIDDEN" });
  await assert.rejects(packageWinners(await actor(), f.id, f.packageIds[0]), {
    code: "FORBIDDEN",
  });
  await Promise.all(
    f.students
      .slice(0, 2)
      .map((s) =>
        joinGame(s, f.id, {
          accepted: true,
          acceptedTermsVersion: f.game.termsVersion,
        }),
      ),
  );
  const before = await snapshot(f.students[0], f.id);
  assert.equal(before.counts.allocated, 0);
  await Promise.all(
    f.students.slice(0, 2).map((s) => submitRanking(s, f.id, f.packageIds)),
  );
  const [a, b] = await Promise.all(
    f.students.slice(0, 2).map((s) => snapshot(s, f.id)),
  );
  assert.deepEqual(a.packages, b.packages);
  assert.deepEqual(a.counts, b.counts);
  assert.equal(a.counts.allocated, 2);
  assert.ok(a.ownSubmission);
  const first = await eventFeed(f.students[0], f.id, "0", 1);
  assert.equal(first.items.length, 1);
  assert.ok(first.hasMore);
  let cursor = first.cursor;
  const all = [...first.items];
  while (true) {
    const page = await eventFeed(f.students[0], f.id, cursor, 2);
    all.push(...page.items);
    cursor = page.cursor;
    if (!page.hasMore) break;
  }
  assert.equal(new Set(all.map((e) => e.id)).size, all.length);
  const reconnected = await eventFeed(f.students[1], f.id, first.cursor);
  assert.deepEqual(reconnected.items, all.slice(1));
  assert.equal((await eventFeed(f.students[1], f.id, cursor)).items.length, 0);
  const json = JSON.stringify({ a, all });
  assert.ok(!json.includes("@example.invalid"));
  assert.ok(!json.includes("password"));
  assert.ok(!json.includes("token"));
  assert.ok(all.some((e) => e.actorName === f.students[0].name));
  const winners = await packageWinners(
    f.students[0],
    f.id,
    f.packageIds[0],
    0,
    1,
  );
  assert.equal(
    winners.items.length,
    Math.min(1, a.packages.find((p) => p.id === f.packageIds[0])!.allocated),
  );
  await assert.rejects(eventFeed(f.students[2], f.id), { code: "FORBIDDEN" });
  await assert.rejects(eventFeed(await actor(), f.id), { code: "FORBIDDEN" });
  await assert.rejects(eventFeed(f.admin, f.id, "invalid"));
  await assert.rejects(
    getDb().execute(sql`DELETE FROM war_events WHERE game_id=${f.id}`),
  );
});
test("uncommitted events never visible to feeds", async () => {
  const f = await gameFixture();
  let ready!: () => void;
  const started = new Promise<void>((r) => (ready = r));
  let release!: () => void;
  const finish = new Promise<void>((r) => (release = r));
  const writing = getDb().transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO war_events(game_id,event_type) VALUES(${f.id},'TEST_UNCOMMITTED')`,
    );
    ready();
    await finish;
    throw new Error("ROLLBACK");
  });
  const rejected = assert.rejects(writing);
  await started;
  assert.equal((await eventFeed(f.students[0], f.id)).items.length, 0);
  release();
  await rejected;
  assert.equal((await eventFeed(f.students[0], f.id)).items.length, 0);
});
