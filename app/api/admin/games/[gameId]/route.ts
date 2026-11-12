import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { deleteWar } from "@/modules/games/management";
import { draftInput, saveDraft } from "@/modules/games/admin";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return endpoint(async () => {
    sameOrigin(request);
    return saveDraft(
      await requireAdmin(request.headers),
      draftInput.parse(await body(request)),
      (await params).gameId,
    );
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    return deleteWar(actor, (await params).gameId, await body(request));
  });
}
