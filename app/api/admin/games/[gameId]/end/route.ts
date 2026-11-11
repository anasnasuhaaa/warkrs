import { z } from "zod";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { endGame } from "@/modules/games/lifecycle";
export async function POST(request:Request,{params}:{params:Promise<{gameId:string}>}) {return endpoint(async()=>{sameOrigin(request);const actor=await requireActor(request.headers);const input=z.object({reason:z.string(),confirmed:z.literal(true)}).parse(await body(request));return endGame(actor,(await params).gameId,input.reason);});}
