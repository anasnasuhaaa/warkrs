import { test, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../db/client";
import { deleteWar, setGameVisibility } from "../modules/games/management";
import { saveDraft, getDraft } from "../modules/games/admin";
import { gameDetail } from "../modules/games/detail";
import { listGames } from "../modules/games/queries";
import { endGame, joinGame } from "../modules/games/lifecycle";
import { submitRanking } from "../modules/allocation/service";
import { deleteStudent } from "../modules/accounts/students";
import { gameFixture, draftFixture } from "./fixtures";
import { DELETE } from "../app/api/admin/games/[gameId]/route";
import { POST as visibility } from "../app/api/admin/games/[gameId]/visibility/route";
import { readAppUrl } from "../lib/config";
after(closeDb);
const reason = "Pembersihan simulasi pengujian fiksi";
const input = (title: string) => ({ confirmation: title, reason, simulationConfirmed: true });
async function counts(id: string) {
  const result = await getDb().execute(sql`SELECT
    (SELECT count(*)::int FROM games WHERE id=${id}) games,
    (SELECT count(*)::int FROM game_packages WHERE game_id=${id}) packages,
    (SELECT count(*)::int FROM game_participants WHERE game_id=${id}) participants,
    (SELECT count(*)::int FROM war_submissions WHERE game_id=${id}) submissions,
    (SELECT count(*)::int FROM war_preferences WHERE game_id=${id}) preferences,
    (SELECT count(*)::int FROM war_allocations WHERE game_id=${id}) allocations,
    (SELECT count(*)::int FROM war_events WHERE game_id=${id}) events,
    (SELECT count(*)::int FROM admin_audit_logs WHERE game_id=${id}) audits`);
  return result.rows[0];
}
test("hidden published Wars leave discovery only; joining, submissions and configuration protections remain", async () => {
  const f = await gameFixture({ join: false });
  await assert.rejects(setGameVisibility(f.students[0], f.id, { isHidden: true }), { code: "FORBIDDEN" });
  const before = await getDraft(f.admin, f.id);
  await setGameVisibility(f.admin, f.id, { isHidden: true });
  assert.ok(!(await listGames(f.students[0])).some(g => g.id === f.id));
  assert.ok((await listGames(f.admin)).some(g => g.id === f.id && g.isHidden && g.status === "Live"));
  await joinGame(f.students[0], f.id, { accepted: true, acceptedTermsVersion: f.game.termsVersion });
  const result = await submitRanking(f.students[0], f.id, f.packageIds);
  assert.equal(result.sequence, 1);
  assert.equal((await gameDetail(f.students[0], f.id)).status, "Live");
  const hidden = await getDraft(f.admin, f.id);
  for (const key of ["startsAt", "endsAt", "publishedAt", "termsText", "termsVersion"] as const) assert.deepEqual(hidden[key], before[key]);
  await assert.rejects(getDb().execute(sql`UPDATE games SET title='Changed',is_hidden=false WHERE id=${f.id}`));
  await endGame(f.admin, f.id, reason);
  await setGameVisibility(f.admin, f.id, { isHidden: false });
  await setGameVisibility(f.admin, f.id, { isHidden: false }); // Idempotent audit.
  const logs = await getDb().execute(sql`SELECT action FROM admin_audit_logs WHERE game_id=${f.id} AND action IN ('GAME_HIDDEN','GAME_SHOWN')`);
  assert.deepEqual(logs.rows.map(r => r.action).sort(), ["GAME_HIDDEN", "GAME_SHOWN"]);
  await assert.rejects(getDb().execute(sql`UPDATE games SET completed_at=NULL,is_hidden=true WHERE id=${f.id}`));
});
test("deletion removes a Completed simulation atomically, preserves independent audit, unrelated Wars and accounts", async () => {
  const f = await gameFixture();
  await submitRanking(f.students[0], f.id, f.packageIds);
  await endGame(f.admin, f.id, reason);
  const other = await gameFixture();
  await submitRanking(other.students[0], other.id, other.packageIds);
  const before = await counts(f.id);
  const unrelated = await counts(other.id);
  await assert.rejects(deleteStudent(f.admin, f.students[0].id), { code: "STUDENT_PROTECTED" });
  await assert.rejects(deleteWar(f.students[0], f.id, input(f.game.title)), { code: "FORBIDDEN" });
  await assert.rejects(deleteWar(f.admin, f.id, input("wrong")), { code: "INVALID_CONFIRMATION" });
  await assert.rejects(deleteWar(f.admin, f.id, { ...input(f.game.title), simulationConfirmed: false }));
  await assert.rejects(getDb().transaction(async tx => {
    await tx.execute(sql`SELECT public.delete_war_permanently(${f.id},${f.admin.id},${f.game.title},${reason},true)`);
    throw new Error("forced caller rollback");
  }), /forced caller rollback/);
  assert.deepEqual(await counts(f.id), before);
  const absentAudit = await getDb().execute(sql`SELECT id FROM admin_audit_logs WHERE action='GAME_PERMANENTLY_DELETED' AND metadata::jsonb->>'deletedGameId'=${f.id}`);
  assert.equal(absentAudit.rows.length, 0);
  await deleteWar(f.admin, f.id, input(f.game.title));
  assert.ok(Object.values(await counts(f.id)).every(v => v === 0));
  assert.deepEqual(await counts(other.id), unrelated);
  const audit = await getDb().execute(sql`SELECT game_id,admin_user_id,reason,metadata FROM admin_audit_logs WHERE action='GAME_PERMANENTLY_DELETED' AND metadata::jsonb->>'deletedGameId'=${f.id}`);
  assert.equal(audit.rows.length, 1);
  assert.equal(audit.rows[0].game_id, null);
  assert.equal(audit.rows[0].admin_user_id, f.admin.id);
  assert.equal(audit.rows[0].reason, reason);
  const metadata = JSON.parse(String(audit.rows[0].metadata));
  assert.equal(metadata.counts.submissions, before.submissions);
  assert.equal(metadata.title, f.game.title);
  assert.ok(metadata.deletedAt && metadata.simulationConfirmed);
  assert.equal((await getDb().execute(sql`SELECT id FROM users WHERE id=${f.students[0].id}`)).rows.length, 1);
  await deleteStudent(f.admin, f.students[0].id); // War membership no longer blocks safe deletion.
  await assert.rejects(gameDetail(f.admin, f.id), { code: "NOT_FOUND" });
  await assert.rejects(deleteWar(f.admin, f.id, input(f.game.title)), { code: "NOT_FOUND" });
  for (const table of ["war_submissions", "war_preferences", "war_allocations", "war_events", "game_participants", "game_packages"])
    await assert.rejects(getDb().execute(sql`DELETE FROM ${sql.identifier(table)} WHERE game_id=${other.id}`));
  await assert.rejects(getDb().execute(sql`DELETE FROM admin_audit_logs WHERE id=${audit.rows[0].id ?? ""} OR (game_id IS NULL AND metadata::jsonb->>'deletedGameId'=${f.id})`));
  assert.equal((await getDb().execute(sql`SELECT * FROM war_admin_private.deletion_permits`)).rows.length, 0);
});
test("Draft and safe Upcoming deletions; Live and unreconciled Closing rejected", async () => {
  const d = await draftFixture();
  const saved = await saveDraft(d.admin, d.input);
  await assert.rejects(setGameVisibility(d.admin, saved.id, { isHidden: true }), { code: "INVALID_STATUS" });
  await deleteWar(d.admin, saved.id, input(d.input.title));
  const upcoming = await gameFixture({ startOffset: 60000, join: false });
  const results = await Promise.allSettled([
    deleteWar(upcoming.admin, upcoming.id, input(upcoming.game.title)),
    joinGame(upcoming.students[0], upcoming.id, { accepted: true, acceptedTermsVersion: upcoming.game.termsVersion }),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.ok(Object.values(await counts(upcoming.id)).every(v => v === 0));
  if (results[1].status === "rejected") assert.equal(results[1].reason.code, "NOT_FOUND");
  const live = await gameFixture();
  const race = await Promise.allSettled([deleteWar(live.admin, live.id, input(live.game.title)), submitRanking(live.students[0], live.id, live.packageIds)]);
  assert.equal(race[0].status, "rejected");
  assert.equal(race[1].status, "fulfilled");
  assert.equal((await counts(live.id)).allocations, 1);
  const closing = await gameFixture({ endOffset: 500, join: false });
  await getDb().execute(sql`SELECT pg_sleep(0.55)`);
  await assert.rejects(deleteWar(closing.admin, closing.id, input(closing.game.title)), { code: "UNSAFE_DELETION" });
  assert.equal((await getDraft(closing.admin, closing.id)).completedAt, null);
});
test("deletion checks DB time after waiting on the common game lock", async () => {
  const f = await gameFixture({ startOffset: 600, join: false });
  let locked!: () => void;
  const ready = new Promise<void>(resolve => { locked = resolve; });
  const holder = getDb().transaction(async tx => {
    await tx.execute(sql`SELECT id FROM games WHERE id=${f.id} FOR UPDATE`);
    locked();
    await tx.execute(sql`SELECT pg_sleep(0.8)`);
  });
  await ready;
  const deleting = deleteWar(f.admin, f.id, input(f.game.title));
  const rejected = assert.rejects(deleting, { code: "UNSAFE_DELETION" });
  await holder;
  await rejected;
  assert.equal((await counts(f.id)).games, 1);
});
test("database delete function rechecks admin, title, state and rejects public execution or caller-set bypasses", async () => {
  const f = await gameFixture();
  for (const [adminId, confirmation] of [[f.students[0].id, f.game.title], [f.admin.id, "wrong"], [f.admin.id, f.game.title]])
    await assert.rejects(getDb().execute(sql`SELECT public.delete_war_permanently(${f.id},${adminId},${confirmation},${reason},true)`));
  await assert.rejects(getDb().transaction(async tx => {
    await tx.execute(sql`SELECT set_config('war.delete_game_id',${f.id},true)`);
    await tx.execute(sql`DELETE FROM games WHERE id=${f.id}`);
  }));
  const role = `test_runtime_${crypto.randomUUID().replaceAll("-", "")}`;
  await assert.rejects(getDb().transaction(async tx => {
    await tx.execute(sql`CREATE ROLE ${sql.identifier(role)} NOLOGIN`);
    await tx.execute(sql`GRANT USAGE ON SCHEMA public TO ${sql.identifier(role)}`);
    await tx.execute(sql`SET LOCAL ROLE ${sql.identifier(role)}`);
    await tx.execute(sql`SELECT public.delete_war_permanently(${f.id},${f.admin.id},${f.game.title},${reason},true)`);
  }), (error: unknown) => error instanceof Error && error.cause instanceof Error && /permission denied/.test(error.cause.message));
  await assert.rejects(getDb().transaction(async tx => {
    await tx.execute(sql`CREATE ROLE ${sql.identifier(role)} NOLOGIN`);
    await tx.execute(sql`SET LOCAL ROLE ${sql.identifier(role)}`);
    await tx.execute(sql`INSERT INTO war_admin_private.deletion_permits VALUES(txid_current(),pg_backend_pid(),${f.id})`);
  }), (error: unknown) => error instanceof Error && error.cause instanceof Error && /permission denied/.test(error.cause.message));
});
test("an explicitly granted runtime role executes deletion without direct permit/table access", async () => {
  const f = await gameFixture();
  await endGame(f.admin, f.id, reason);
  const before = await counts(f.id);
  const role = `test_runtime_${crypto.randomUUID().replaceAll("-", "")}`;
  await assert.rejects(getDb().transaction(async tx => {
    await tx.execute(sql`CREATE ROLE ${sql.identifier(role)} NOLOGIN`);
    await tx.execute(sql`GRANT USAGE ON SCHEMA public TO ${sql.identifier(role)}`);
    await tx.execute(sql`GRANT EXECUTE ON FUNCTION public.delete_war_permanently(text,text,text,text,boolean) TO ${sql.identifier(role)}`);
    await tx.execute(sql`SET LOCAL ROLE ${sql.identifier(role)}`);
    const result = await tx.execute(sql`SELECT public.delete_war_permanently(${f.id},${f.admin.id},${f.game.title},${reason},true) AS counts`);
    assert.equal((result.rows[0].counts as {participants: number}).participants, 2);
    throw new Error("rollback limited role");
  }), /rollback limited role/);
  assert.deepEqual(await counts(f.id), before);
});

test("management endpoints reject anonymous and cross-origin requests before parsing destructive inputs", async () => {
  for (const handler of [DELETE, visibility]) {
    for (const origin of [readAppUrl(), "https://evil.invalid"]) {
      const response = await handler(new Request("http://localhost:3000/api/admin/games/unknown", { method: handler === DELETE ? "DELETE" : "POST", headers: { Origin: origin }, body: "invalid" }), { params: Promise.resolve({gameId: "unknown"}) });
      assert.equal(response.status, origin === readAppUrl() ? 401 : 403);
    }
  }
});
