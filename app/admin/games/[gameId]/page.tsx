import { pageActor } from "@/lib/page-auth";
import { getDraft } from "@/modules/games/admin";
import { listStudents } from "@/modules/accounts/service";
import { GameEditor, PublishGame } from "@/components/domain/game-editor";
import { Badge } from "@/components/ui/badge";
import { jakarta } from "@/lib/time";
export default async function Page({params}:{params:Promise<{gameId:string}>}) {
 const actor=await pageActor(true);const game=await getDraft(actor,(await params).gameId);
 return <><div><Badge variant="secondary">{game.publishedAt?"Terbit · konfigurasi terkunci":"Draf"}</Badge><h1 className="mt-3 text-3xl font-bold">{game.title}</h1></div>{!game.publishedAt?<><GameEditor students={await listStudents(actor)} draft={{id:game.id,title:game.title,termsText:game.termsText,startsAt:game.startsAt.toISOString(),endsAt:game.endsAt.toISOString(),packages:game.packages,userIds:game.whitelist.map(p=>p.userId)}}/><PublishGame id={game.id}/></>:<section className="space-y-4"><p>{jakarta(game.startsAt)} – {jakarta(game.endsAt)}</p><p>{game.packages.length} paket · {game.whitelist.length} daftar peserta · {game.packages.reduce((n,p)=>n+p.capacity,0)} kuota</p><p className="whitespace-pre-wrap rounded-lg border p-4 text-sm">{game.termsText}</p>{game.packages.map(p=><p key={p.id}>{p.name} · kuota {p.capacity}</p>)}</section>}</>;
}
