import { pageActor } from "@/lib/page-auth";
import { gameDetail } from "@/modules/games/detail";
import { GameRoom, type RoomGame } from "@/components/domain/game-room";
export default async function Page({params}:{params:Promise<{gameId:string}>}) {
 const game=await gameDetail(await pageActor(),(await params).gameId);
 return <GameRoom initial={JSON.parse(JSON.stringify(game)) as RoomGame}/>;
}
