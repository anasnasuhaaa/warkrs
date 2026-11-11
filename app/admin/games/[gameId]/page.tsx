import { EndGame } from "@/components/domain/end-game";
import { gameDetail } from "@/modules/games/detail";
import { monitorGame } from "@/modules/games/lifecycle";
import { statusLabel } from "@/modules/games/status";
import { pageActor } from "@/lib/page-auth";
import { getDraft } from "@/modules/games/admin";
import { listStudents } from "@/modules/accounts/service";
import { GameEditor, PublishGame } from "@/components/domain/game-editor";
import { Badge } from "@/components/ui/badge";
import { jakarta } from "@/lib/time";
export default async function Page({params}:{params:Promise<{gameId:string}>}) {
 const actor=await pageActor(true);const game=await getDraft(actor,(await params).gameId);
 const detail=await gameDetail(actor,game.id);const monitor=await monitorGame(actor,game.id);
 return <><div><Badge variant="secondary">{game.publishedAt?"Terbit · konfigurasi terkunci":"Draf"}</Badge><h1 className="mt-3 text-3xl font-bold">{game.title}</h1></div>{!game.publishedAt?<><GameEditor students={await listStudents(actor)} draft={{id:game.id,title:game.title,termsText:game.termsText,startsAt:game.startsAt.toISOString(),endsAt:game.endsAt.toISOString(),packages:game.packages,userIds:game.whitelist.map(p=>p.userId)}}/><PublishGame id={game.id}/></>:<section className="space-y-4"><p className="font-semibold">{statusLabel[detail.status]}</p>{detail.status==='Live'&&<EndGame id={game.id}/>}<div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><p>Daftar peserta: {monitor.whitelisted}</p><p>Bergabung: {monitor.joined}</p><p>Belum bergabung: {monitor.notJoined}</p></div><details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Status peserta</summary><ul className="mt-4 space-y-2 text-sm">{monitor.members.map(m=><li key={m.id}>{m.name} · {m.joinedAt?"Sudah bergabung":"Belum bergabung"}</li>)}</ul></details><p>{jakarta(game.startsAt)} – {jakarta(game.endsAt)}</p><p>{game.packages.length} paket · {game.whitelist.length} daftar peserta · {game.packages.reduce((n,p)=>n+p.capacity,0)} kuota</p><p className="whitespace-pre-wrap rounded-lg border p-4 text-sm">{game.termsText}</p>{game.packages.map(p=><p key={p.id}>{p.name} · kuota {p.capacity}</p>)}</section>}</>;
}
