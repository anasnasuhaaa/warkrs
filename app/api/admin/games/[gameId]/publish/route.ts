import { endpoint, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { publishGame } from "@/modules/games/admin";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return endpoint(async () => {
    sameOrigin(request);
    return publishGame(
      await requireAdmin(request.headers),
      (await params).gameId,
    );
  });
}
