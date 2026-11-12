import { pageActor } from "@/lib/page-auth";
import { listGames } from "@/modules/games/queries";
import { GameList } from "@/components/domain/game-list";
import { PageHeader } from "@/components/domain/page-header";
export default async function Page() {
  const games = await listGames(await pageActor());
  return (
    <>
      <PageHeader
        title="Daftar War"
        description="War yang ditetapkan untukmu. Buka War untuk bergabung atau melihat hasil."
      />
      <GameList games={games} />
    </>
  );
}
