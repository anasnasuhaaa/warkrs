import { test } from "node:test";
import assert from "node:assert/strict";
import { accountEmail } from "../modules/accounts/email";
test("branded email variants escape HTML and preserve fragment links and text fallback", () => {
  for (const purpose of ["ACTIVATION", "PASSWORD_RESET"] as const) {
    const url = `https://war.example.invalid/${purpose === "ACTIVATION" ? "activate" : "reset-password"}#fictional_token`;
    const email = accountEmail(purpose, url, '<img src=x onerror="x">');
    assert.equal(email.subject, purpose === "ACTIVATION" ? "Aktivasi Akun War KRS Ilkomerz 62" : "Reset Kata Sandi War KRS Ilkomerz 62");
    assert.ok(email.html.includes(`href="${url}"`));
    assert.ok(!email.html.includes('<img'));
    assert.ok(email.html.includes("&lt;img"));
    assert.ok(email.text.includes(url));
    assert.ok(email.text.includes("1 jam") && email.text.includes("sekali"));
    assert.ok(accountEmail(purpose, url).text.startsWith("Halo."));
  }
});
