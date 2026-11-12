import { pageActor, pageData } from "@/lib/page-auth";
import { gameDetail } from "@/modules/games/detail";
import { GameRoom, type RoomGame } from "@/components/domain/game-room";
export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const actor = await pageActor();
  const id = (await params).gameId;
  const game = await pageData(() => gameDetail(actor, id));
  return <GameRoom initial={JSON.parse(JSON.stringify(game)) as RoomGame} />;
}
