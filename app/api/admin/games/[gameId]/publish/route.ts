import { endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { publishGame } from "@/modules/games/admin";
export async function POST(request:Request,{params}:{params:Promise<{gameId:string}>}) { return endpoint(async()=>{sameOrigin(request);return publishGame(await requireActor(request.headers),(await params).gameId);}); }
