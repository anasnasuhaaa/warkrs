import { pageActor } from "@/lib/page-auth";
import { listGames } from "@/modules/games/queries";
import { GameList } from "@/components/domain/game-list";
export default async function Page() {const games=await listGames(await pageActor());return <><div><h1 className="text-3xl font-bold">Game untukmu</h1><p className="mt-2 text-muted-foreground">Bergabung, baca ketentuan, dan ikuti jadwal game angkatan.</p></div><GameList games={games}/></>;}
