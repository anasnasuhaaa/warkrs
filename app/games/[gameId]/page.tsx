import { pageActor } from "@/lib/page-auth";
import { gameDetail } from "@/modules/games/detail";
import { statusLabel } from "@/modules/games/status";
import { Badge } from "@/components/ui/badge";
import { jakarta } from "@/lib/time";
export default async function Page({params}:{params:Promise<{gameId:string}>}) {
 const game=await gameDetail(await pageActor(),(await params).gameId);
 return <><Badge>{statusLabel[game.status]}</Badge><h1 className="text-3xl font-bold">{game.title}</h1><p>{jakarta(game.startsAt)} – {jakarta(game.endsAt)}</p><section className="space-y-3"><h2 className="text-xl font-semibold">Ketentuan game</h2><p className="whitespace-pre-wrap rounded-lg border p-4 text-sm">{game.termsText}</p><p className="text-sm text-muted-foreground">Bergabung dan persetujuan ketentuan tersedia pada tahap berikutnya. Pilihan paket hanya dapat diurutkan saat Live.</p></section></>;
}
