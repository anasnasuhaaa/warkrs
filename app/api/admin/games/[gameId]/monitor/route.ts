import { endpoint } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { monitorGame } from "@/modules/games/lifecycle";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return endpoint(async () =>
    monitorGame(await requireAdmin(request.headers), (await params).gameId),
  );
}
