import { test, after } from "node:test";
import assert from "node:assert/strict";
import { closeDb } from "../db/client";
import { limit } from "../lib/rate-limit";
import { sameOrigin } from "../lib/http";
import { POST as adminCreate } from "../app/api/admin/games/route";
import { GET as snapshot } from "../app/api/games/[gameId]/snapshot/route";
import { readAppUrl } from "../lib/config";
import "./helpers";
after(closeDb);
test("database rate limits serialize concurrent attempts", async () => {
  const key = `test:${crypto.randomUUID()}`;
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => limit(key, 3)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
  for (const r of results)
    if (r.status === "rejected") assert.equal(r.reason.code, "RATE_LIMITED");
  await assert.rejects(limit(key, 3), { code: "RATE_LIMITED" });
});
test("mutations require exact Origin; unauthenticated APIs fail closed before input validation", async () => {
  for (const origin of [undefined, "https://evil.invalid", "null"]) {
    assert.throws(
      () =>
        sameOrigin(
          new Request("http://localhost:3000/api/admin/games", {
            method: "POST",
            headers: origin ? { Origin: origin } : {},
          }),
        ),
      { code: "FORBIDDEN" },
    );
  }
  const response = await adminCreate(
    new Request("http://localhost:3000/api/admin/games", {
      method: "POST",
      headers: { Origin: readAppUrl(), "Content-Type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(response.status, 401);
  const read = await snapshot(
    new Request("http://localhost:3000/api/games/unknown/snapshot"),
    { params: Promise.resolve({ gameId: "unknown" }) },
  );
  assert.equal(read.status, 401);
  const json = await read.json();
  assert.deepEqual(Object.keys(json), ["error"]);
  assert.equal(json.error.code, "UNAUTHENTICATED");
});
