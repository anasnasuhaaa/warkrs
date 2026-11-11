import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { joinGame, joinInput } from "@/modules/games/lifecycle";
export async function POST(request:Request,{params}:{params:Promise<{gameId:string}>}) {return endpoint(async()=>{sameOrigin(request);return joinGame(await requireActor(request.headers),(await params).gameId,joinInput.parse(await body(request)));});}
