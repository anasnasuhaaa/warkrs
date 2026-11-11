import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../db/client";
import { assertTestDatabase } from "../tests/helpers";
type Fixture = {
  count: number;
  gameId: string;
  packageIds: string[];
  clients: { userId: string; cookie: string }[];
};
async function main() {
  assertTestDatabase();
  if (process.env.EMAIL_MODE === "resend")
    throw new Error("EMAIL_MUST_BE_DISABLED");
  const count = Number(process.argv[2] ?? 200);
  if (![200, 500].includes(count)) throw new Error("Use 200 or 500 clients");
  const target = new URL(process.env.LOAD_BASE_URL ?? "http://localhost:3000");
  if (!["localhost", "127.0.0.1", "web"].includes(target.hostname))
    throw new Error("Only local/internal load targets allowed");
  const origin = process.env.APP_BASE_URL ?? target.origin;
  const fixture = JSON.parse(
    await readFile(`.test-artifacts/load-${count}.json`, "utf8"),
  ) as Fixture;
  assert.equal(fixture.count, count);
  const initial = await getDb().execute(
    sql`SELECT count(*)::int AS n FROM war_submissions WHERE game_id=${fixture.gameId}`,
  );
  assert.equal(
    initial.rows[0].n,
    0,
    "Create fresh fixtures for every measured run; games cannot reset.",
  );
  const started = performance.now();
  const responses = await Promise.all(
    fixture.clients.map(async (client) => {
      const start = performance.now();
      try {
        const response = await fetch(
          new URL(`/api/games/${fixture.gameId}/submissions`, target),
          {
            method: "POST",
            headers: {
              Origin: origin,
              "Content-Type": "application/json",
              Cookie: client.cookie,
            },
            body: JSON.stringify({ packageIds: fixture.packageIds }),
            signal: AbortSignal.timeout(30000),
          },
        );
        const json = await response.json();
        return {
          status: response.status,
          elapsed: performance.now() - start,
          data: json.data,
          code: json.error?.code,
        };
      } catch {
        return {
          status: 0,
          elapsed: performance.now() - start,
          data: undefined,
          code: "NETWORK_ERROR",
        };
      }
    }),
  );
  const elapsed = performance.now() - started;
  const success = responses.filter((r) => r.status === 200);
  const times = responses.map((r) => r.elapsed).sort((a, b) => a - b);
  const failures = responses
    .filter((r) => r.status !== 200)
    .reduce(
      (out, r) => ({
        ...out,
        [r.code ?? r.status]: (out[r.code ?? r.status] ?? 0) + 1,
      }),
      {} as Record<string, number>,
    );
  const integrity = await getDb().execute(sql`SELECT
  (SELECT count(*)::int FROM war_submissions WHERE game_id=${fixture.gameId}) AS submissions,
  (SELECT count(*)::int FROM war_allocations WHERE game_id=${fixture.gameId}) AS allocations,
  (SELECT count(*)::int FROM game_packages p WHERE p.game_id=${fixture.gameId} AND (p.allocated_count>p.capacity OR p.allocated_count<>(SELECT count(*) FROM war_allocations a WHERE a.package_id=p.id))) AS bad,
  (SELECT count(*)::int FROM (SELECT user_id FROM war_allocations WHERE game_id=${fixture.gameId} GROUP BY user_id HAVING count(*)>1) d) AS duplicates`);
  const report = {
    scenario: "HTTP simultaneous submit",
    count,
    totalMs: Math.round(elapsed),
    p50Ms: Math.round(times[Math.ceil(count * 0.5) - 1]),
    p95Ms: Math.round(times[Math.ceil(count * 0.95) - 1]),
    p99Ms: Math.round(times[Math.ceil(count * 0.99) - 1]),
    success: success.length,
    failures,
    integrity: integrity.rows[0],
    node: process.version,
    observedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(report, null, 2));
  await writeFile(
    `.test-artifacts/load-result-${count}.json`,
    JSON.stringify(report, null, 2),
  );
  assert.equal(success.length, count);
  assert.deepEqual(integrity.rows[0], {
    submissions: count,
    allocations: count,
    bad: 0,
    duplicates: 0,
  });
  assert.equal(new Set(success.map((r) => r.data.submissionId)).size, count);
  assert.deepEqual(
    success.map((r) => r.data.sequence).sort((a, b) => a - b),
    Array.from({ length: count }, (_, i) => i + 1),
  );
  const retry = await fetch(
    new URL(`/api/games/${fixture.gameId}/submissions`, target),
    {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: fixture.clients[0].cookie,
      },
      body: JSON.stringify({ packageIds: fixture.packageIds }),
    },
  );
  assert.equal(retry.status, 200);
  assert.equal(
    (await retry.json()).data.submissionId,
    responses[0].data.submissionId,
  );
}
void main()
  .catch(() => {
    console.error(
      "Load verification failed. Review the non-sensitive metrics report; do not reset outcomes.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
