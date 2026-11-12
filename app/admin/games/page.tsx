import Link from "next/link";
import { Plus } from "lucide-react";
import { pageActor } from "@/lib/page-auth";
import { listGames } from "@/modules/games/queries";
import { GameList } from "@/components/domain/game-list";
import { PageHeader } from "@/components/domain/page-header";
import { Button } from "@/components/ui/button";
export default async function Page() {
  const games = await listGames(await pageActor(true));
  return (
    <>
      <PageHeader
        title="Daftar War"
        description="Kelola draf, jadwal, dan pantau hasil setiap War."
        action={
          <Button asChild>
            <Link href="/admin/games/new">
              <Plus className="size-4" aria-hidden="true" />
              Buat War
            </Link>
          </Button>
        }
      />
      <GameList games={games} admin />
    </>
  );
}
