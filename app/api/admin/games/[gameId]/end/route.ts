import { endWarInput } from "@/lib/game-validation";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { endGame } from "@/modules/games/lifecycle";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    const input = endWarInput.parse(await body(request));
    return endGame(actor, (await params).gameId, input.reason);
  });
}
