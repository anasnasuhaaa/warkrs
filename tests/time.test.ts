import { test } from "node:test";
import assert from "node:assert/strict";
import { jakartaPrecise } from "../lib/time";
import { consentNoticeFor } from "../modules/games/terms";
test("WIB clock preserves receipt milliseconds, midnight and full date", () => {
  assert.equal(jakartaPrecise("2026-11-12T12:00:01.245Z"), "19:00:01.245 WIB");
  assert.equal(jakartaPrecise("2026-11-12T17:00:00.007Z", true), "2026-11-13 00:00:00.007 WIB");
  assert.equal(jakartaPrecise("2026-11-12T17:00:00.000Z"), "00:00:00.000 WIB");
  assert.ok(consentNoticeFor("nim-v2:fiction").includes("NIM"));
  assert.ok(!consentNoticeFor("legacy").includes("NIM"));
});
