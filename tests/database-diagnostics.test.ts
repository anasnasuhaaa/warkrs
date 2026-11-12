import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseFailure } from "../scripts/database-diagnostics";

test("aggregate network failures expose actionable codes without connection secrets", () => {
  const secret = "postgresql://private-role:private-password@private-host/private-db";
  const error = new AggregateError([
    Object.assign(new Error(secret), { code: "ETIMEDOUT" }),
    Object.assign(new Error(secret), { code: "ENETUNREACH" }),
  ], secret);
  const message = databaseFailure(error, "connection");
  assert.match(message, /tahap koneksi/);
  assert.match(message, /ETIMEDOUT/);
  assert.match(message, /ENETUNREACH/);
  for (const part of [secret, "private-role", "private-password", "private-host", "private-db"]) assert.ok(!message.includes(part));
});
test("nested Drizzle errors report SQLSTATE without SQL, detail or private data", () => {
  const cause = Object.assign(new Error("raw row data"), { code: "42501", detail: "private data" });
  const error = Object.assign(new Error("Failed query: SELECT private data"), { cause });
  const message = databaseFailure(error, "migration");
  assert.match(message, /tahap migrasi SQL/);
  assert.match(message, /42501/);
  assert.match(message, /pemilik skema/);
  assert.ok(!message.includes("private data"));
  assert.ok(!message.includes("raw row"));
});
test("TLS failures, message-only timeouts, unknown SQLSTATE and circular errors remain safe", () => {
  assert.match(databaseFailure({ code: "SELF_SIGNED_CERT_IN_CHAIN" }, "connection"), /TLS/);
  assert.match(databaseFailure(new Error("Connection terminated due to connection timeout"), "connection"), /ETIMEDOUT/);
  assert.match(databaseFailure({ code: "23503", message: "private foreign key value" }, "migration"), /23503/);
  const cyclic: { cause?: unknown; message: string; code: string } = { message: "private password", code: "postgres://secret" };
  cyclic.cause = cyclic;
  const message = databaseFailure(cyclic, "configuration");
  assert.match(message, /tahap konfigurasi/);
  assert.ok(!message.includes("private password") && !message.includes("postgres://secret"));
});
