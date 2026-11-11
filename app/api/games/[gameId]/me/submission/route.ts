import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { ownSubmission } from "@/modules/allocation/service";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return endpoint(async () =>
    ownSubmission(await requireActor(request.headers), (await params).gameId),
  );
}
