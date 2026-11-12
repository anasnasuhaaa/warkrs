import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { hashPassword } from "better-auth/crypto";
import { getDb, closeDb } from "../db/client";
import { user, account } from "../db/schema";
import { getAuth } from "../lib/auth";
import { readAppUrl } from "../lib/config";
import { saveDraft, publishGame, getDraft } from "../modules/games/admin";
import { joinGame } from "../modules/games/lifecycle";
import { assertTestDatabase, actor, dbNow } from "../tests/helpers";
async function main() {
  assertTestDatabase();
  if (process.env.EMAIL_MODE === "resend")
    throw new Error("EMAIL_MUST_BE_DISABLED");
  const count = Number(process.argv[2] ?? 200);
  if (![200, 500].includes(count)) throw new Error("Use 200 or 500 clients");
  const admin = await actor("ADMIN");
  const password = randomBytes(32).toString("base64url");
  const hash = await hashPassword(password);
  const students = Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    name: `Peserta Fiksi Beban ${i + 1}`,
    nim: `L${randomUUID().replaceAll("-", "").toUpperCase()}`,
    email: `${randomUUID()}@example.invalid`,
    role: "STUDENT",
    emailVerified: true,
  }));
  await getDb().insert(user).values(students);
  await getDb()
    .insert(account)
    .values(
      students.map((s) => ({
        id: randomUUID(),
        userId: s.id,
        accountId: s.id,
        providerId: "credential",
        password: hash,
      })),
    );
  const now = await dbNow();
  const { id } = await saveDraft(admin, {
    title: `Fiksi HTTP ${count} ${randomUUID().slice(0, 8)}`,
    termsText:
      "Game fiksi untuk pengujian lokal. Tidak ada data atau email mahasiswa nyata.",
    startsAt: new Date(now.getTime() - 60000).toISOString(),
    endsAt: new Date(now.getTime() + 3600000).toISOString(),
    packages: [
      { name: "A", capacity: Math.floor(count / 4) },
      { name: "B", capacity: Math.floor(count / 4) },
      { name: "C", capacity: count - 2 * Math.floor(count / 4) },
    ],
    userIds: students.map((s) => s.id),
  });
  await publishGame(admin, id);
  const game = await getDraft(admin, id);
  const clients = [];
  for (let offset = 0; offset < count; offset += 10) {
    const batch = await Promise.all(
      students.slice(offset, offset + 10).map(async (s) => {
        await joinGame(s, id, {
          accepted: true,
          acceptedTermsVersion: game.termsVersion,
        });
        // Official server-side auth API prepares library-signed sessions before timing.
        // Request-time role/session checks still run through the real HTTP endpoint.
        const response = await getAuth().api.signInEmail({
          body: { email: s.email, password },
          headers: new Headers({ Origin: readAppUrl() }),
          asResponse: true,
        });
        if (!response.ok) throw new Error("TEST_LOGIN_FAILED");
        const cookie = response.headers
          .getSetCookie()
          .map((v) => v.split(";")[0])
          .join("; ");
        if (!cookie) throw new Error("NO_TEST_SESSION");
        return { userId: s.id, cookie };
      }),
    );
    clients.push(...batch);
    if (clients.length % 100 === 0)
      console.log(`Prepared ${clients.length}/${count} fictional sessions.`);
  }
  await mkdir(".test-artifacts", { recursive: true });
  await writeFile(
    `.test-artifacts/load-${count}.json`,
    JSON.stringify({
      count,
      gameId: id,
      packageIds: game.packages.map((p) => p.id),
      clients,
    }),
    { mode: 0o600 },
  );
  console.log(
    `HTTP load fixture ready for ${count} clients. No credentials printed.`,
  );
}
void main()
  .catch(() => {
    console.error(
      "Load preparation failed. Use an isolated _test DB, valid auth configuration and disabled email.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
