import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { monitorGame } from "@/modules/games/lifecycle";
export async function GET(request:Request,{params}:{params:Promise<{gameId:string}>}) {return endpoint(async()=>monitorGame(await requireActor(request.headers),(await params).gameId));}
