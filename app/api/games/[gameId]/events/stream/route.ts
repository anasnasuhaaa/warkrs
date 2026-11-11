import { endpoint } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { cursorSchema, eventFeed } from "@/modules/activity/queries";
export const runtime="nodejs";
export const maxDuration=30;
export async function GET(request:Request,{params}:{params:Promise<{gameId:string}>}) {
 if(process.env.VERCEL||process.env.REALTIME_MODE!=="sse")return new Response(null,{status:404});
 const id=(await params).gameId;let actor;let cursor=request.headers.get("last-event-id")??new URL(request.url).searchParams.get("after")??"0";
 const checked=await endpoint(async()=>{actor=await requireActor(request.headers);cursorSchema.parse(cursor);await eventFeed(actor,id,cursor,1);return null;});
 if(!checked.ok||!actor)return checked;const viewer=actor;const encoder=new TextEncoder();let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;let resume:(()=>void)|undefined;
 function stop(){stopped=true;clearTimeout(timer);resume?.();}
 request.signal.addEventListener("abort",stop,{once:true});
 const stream=new ReadableStream({async start(controller){const until=Date.now()+25000;try{while(!stopped&&Date.now()<until){const page=await eventFeed(viewer,id,cursor,100);if(stopped)break;for(const item of page.items){controller.enqueue(encoder.encode(`id: ${item.id}\nevent: activity\ndata: ${JSON.stringify(item)}\n\n`));cursor=String(item.id);}controller.enqueue(encoder.encode(": heartbeat\n\n"));if(!page.hasMore)await new Promise<void>(resolve=>{resume=resolve;timer=setTimeout(resolve,2000);});}}catch{if(!stopped)controller.enqueue(encoder.encode("event: reconnect\ndata: {}\n\n"));}finally{request.signal.removeEventListener("abort",stop);if(!stopped)controller.close();stop();}},cancel:stop});
 return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no","Connection":"keep-alive"}});
}
