import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { listGames } from "@/modules/games/queries";
export async function GET(request:Request) { return endpoint(async()=>listGames(await requireActor(request.headers))); }
