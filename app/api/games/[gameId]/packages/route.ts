import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { packageWinners } from "@/modules/activity/queries";
export async function GET(request:Request,{params}:{params:Promise<{gameId:string}>}){return endpoint(async()=>{const q=new URL(request.url).searchParams;return packageWinners(await requireActor(request.headers),(await params).gameId,q.get("packageId")??"",Number(q.get("afterSequence")??0),Number(q.get("limit")??50));});}
