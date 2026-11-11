import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { hashPassword } from "better-auth/crypto";
import { getDb, closeDb } from "../db/client";
import { user, account } from "../db/schema";
import { saveDraft, publishGame, getDraft } from "../modules/games/admin";
import { joinGame, endGame } from "../modules/games/lifecycle";
import { submitRanking } from "../modules/allocation/service";
import { issueToken } from "../modules/accounts/service";
import { assertTestDatabase, dbNow } from "../tests/helpers";
async function main() {
  assertTestDatabase();
  const password = randomBytes(24).toString("base64url");
  const hash = await hashPassword(password);
  async function create(role = "STUDENT", active = true) {
    const id = randomUUID();
    const data = {
      id,
      name: `Fiksi Browser ${id.slice(0, 6)}`,
      email: `${id}@example.invalid`,
      role,
      emailVerified: active,
    };
    await getDb().insert(user).values(data);
    if (active)
      await getDb()
        .insert(account)
        .values({
          id: randomUUID(),
          userId: id,
          accountId: id,
          providerId: "credential",
          password: hash,
        });
    return data;
  }
  const admin = await create("ADMIN");
  const student = await create();
  const second = await create();
  const inactive = await create("STUDENT", false);
  const activationToken = await issueToken(inactive.id, "ACTIVATION");
  async function createGame(
    title: string,
    startOffset = -60000,
    publish = true,
  ) {
    const now = await dbNow();
    const result = await saveDraft(admin, {
      title,
      termsText: "Ketentuan simulasi browser. Hasil tidak mewakili KRS kampus.",
      startsAt: new Date(now.getTime() + startOffset).toISOString(),
      endsAt: new Date(now.getTime() + 3600000).toISOString(),
      packages: [
        { name: "Paket A", capacity: 1 },
        { name: "Paket B", capacity: 1 },
      ],
      userIds: [student.id, second.id],
    });
    if (publish) await publishGame(admin, result.id);
    return getDraft(admin, result.id);
  }
  const live = [];
  for (const width of [320, 375, 768, 1440])
    live.push({ width, game: await createGame(`Fiksi viewport ${width}`) });
  const upcoming = await createGame("Fiksi ruang tunggu", 600000);
  const simultaneous = await createGame("Fiksi dua browser");
  const draft = await createGame("Fiksi draf", 600000, false);
  const completed = await createGame("Fiksi riwayat");
  await joinGame(student, completed.id, {
    accepted: true,
    acceptedTermsVersion: completed.termsVersion,
  });
  await submitRanking(
    student,
    completed.id,
    completed.packages.map((p) => p.id),
  );
  await endGame(admin, completed.id, "Pengujian browser riwayat selesai");
  await mkdir(".test-artifacts", { recursive: true });
  await writeFile(
    ".test-artifacts/browser-fixtures.json",
    JSON.stringify({
      admin,
      student,
      second,
      inactive,
      password,
      activationToken,
      live,
      upcoming,
      simultaneous,
      draft,
      completed,
    }),
    { mode: 0o600 },
  );
  console.log(
    "Fictional browser fixtures prepared in ignored artifact directory.",
  );
}
void main()
  .catch(() => {
    console.error("Browser fixture setup failed.");
    process.exitCode = 1;
  })
  .finally(closeDb);
