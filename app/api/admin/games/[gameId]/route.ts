import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { draftInput, saveDraft } from "@/modules/games/admin";
export async function PATCH(request:Request,{params}:{params:Promise<{gameId:string}>}) { return endpoint(async()=>{sameOrigin(request);return saveDraft(await requireActor(request.headers),draftInput.parse(await body(request)),(await params).gameId);}); }
