import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { eventFeed } from "@/modules/activity/queries";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return endpoint(async () => {
    const q = new URL(request.url).searchParams;
    return eventFeed(
      await requireActor(request.headers),
      (await params).gameId,
      q.get("after") ?? "0",
      Number(q.get("limit") ?? 100),
    );
  });
}
