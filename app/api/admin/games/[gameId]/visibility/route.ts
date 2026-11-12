import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { setGameVisibility } from "@/modules/games/management";
export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    return setGameVisibility(actor, (await params).gameId, await body(request));
  });
}
