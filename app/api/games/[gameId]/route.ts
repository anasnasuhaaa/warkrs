import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { gameDetail } from "@/modules/games/detail";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return endpoint(async () =>
    gameDetail(await requireActor(request.headers), (await params).gameId),
  );
}
