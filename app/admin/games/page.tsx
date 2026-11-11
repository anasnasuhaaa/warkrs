import Link from "next/link";
import { pageActor } from "@/lib/page-auth";
import { listGames } from "@/modules/games/queries";
import { GameList } from "@/components/domain/game-list";
import { Button } from "@/components/ui/button";
export default async function Page() {
  const games = await listGames(await pageActor(true));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Game angkatan</h1>
        <Button asChild>
          <Link href="/admin/games/new">Buat game</Link>
        </Button>
      </div>
      <GameList games={games} admin />
    </>
  );
}
