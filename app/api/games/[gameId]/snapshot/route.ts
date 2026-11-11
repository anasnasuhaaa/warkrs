import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { snapshot } from "@/modules/activity/queries";
export async function GET(request:Request,{params}:{params:Promise<{gameId:string}>}){return endpoint(async()=>snapshot(await requireActor(request.headers),(await params).gameId));}
