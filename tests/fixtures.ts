import { actor, dbNow } from "./helpers";
import {
  saveDraft,
  publishGame,
  getDraft,
  type DraftInput,
} from "../modules/games/admin";
import { joinGame } from "../modules/games/lifecycle";
export async function draftFixture(count = 2, capacity = count) {
  const admin = await actor("ADMIN");
  const students = await Promise.all(
    Array.from({ length: count }, () => actor()),
  );
  const now = await dbNow();
  const input: DraftInput = {
    title: "Simulasi Fiksi",
    termsText: "Ketentuan fiksi",
    startsAt: new Date(now.getTime() + 60000).toISOString(),
    endsAt: new Date(now.getTime() + 3600000).toISOString(),
    packages: [{ name: "Paket A", capacity }],
    userIds: students.map((s) => s.id),
  };
  return { admin, students, input };
}
export async function gameFixture(
  options: {
    count?: number;
    capacities?: number[];
    startOffset?: number;
    endOffset?: number;
    join?: boolean;
  } = {},
) {
  const count = options.count ?? 2;
  const fixture = await draftFixture(count);
  const now = await dbNow();
  const input = {
    ...fixture.input,
    startsAt: new Date(
      now.getTime() + (options.startOffset ?? -60000),
    ).toISOString(),
    endsAt: new Date(
      now.getTime() + (options.endOffset ?? 3600000),
    ).toISOString(),
    packages: (options.capacities ?? [count]).map((capacity, i) => ({
      name: `Paket ${i + 1}`,
      capacity,
    })),
  };
  const { id } = await saveDraft(fixture.admin, input);
  await publishGame(fixture.admin, id);
  const game = await getDraft(fixture.admin, id);
  if (options.join !== false)
    await Promise.all(
      fixture.students.map((s) =>
        joinGame(s, id, {
          accepted: true,
          acceptedTermsVersion: game.termsVersion,
        }),
      ),
    );
  return { ...fixture, game, id, packageIds: game.packages.map((p) => p.id) };
}
