import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { draftInput, saveDraft } from "@/modules/games/admin";
export async function POST(request:Request) { return endpoint(async()=>{sameOrigin(request);return saveDraft(await requireActor(request.headers),draftInput.parse(await body(request)));}); }
