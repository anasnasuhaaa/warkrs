import { test } from "node:test";
import assert from "node:assert/strict";
import { draftFormInput, publicationInput } from "../lib/game-validation";
import { fieldErrors } from "../lib/form-errors";
test("draft errors identify dates, names, quotas and duplicate packages; publish identifies missing fields", () => {
  const value = { title: "War", termsText: "", startsAt: "2026-11-12T10:00:00Z", endsAt: "2026-11-12T09:00:00Z", packages: [{name: "A", capacity: 1}, {name: "a", capacity: 1}], userIds: [] };
  const result = draftFormInput.safeParse(value);
  assert.ok(!result.success);
  assert.ok(fieldErrors(result.error).endsAt);
  assert.ok(fieldErrors(result.error)["packages.1.name"]);
  const missing = publicationInput.safeParse({...value, endsAt: "2026-11-12T11:00:00Z", packages: []});
  assert.ok(!missing.success);
  assert.deepEqual(Object.keys(fieldErrors(missing.error)).sort(), ["packages", "termsText", "userIds"]);
  const quota = draftFormInput.safeParse({...value, packages: [{name: "", capacity: 0}]});
  assert.ok(!quota.success);
  assert.ok(fieldErrors(quota.error)["packages.0.capacity"]);
});
