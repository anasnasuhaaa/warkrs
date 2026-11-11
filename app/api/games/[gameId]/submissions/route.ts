import { z } from "zod";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { submitRanking } from "@/modules/allocation/service";
export const maxDuration=30;
export async function POST(request:Request,{params}:{params:Promise<{gameId:string}>}) {return endpoint(async()=>{sameOrigin(request);const actor=await requireActor(request.headers);const input=z.object({packageIds:z.unknown()}).parse(await body(request));return submitRanking(actor,(await params).gameId,input.packageIds);});}
