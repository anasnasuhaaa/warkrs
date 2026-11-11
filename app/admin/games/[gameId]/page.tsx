import Link from "next/link";
import { ArrowLeft, LockKeyhole, CalendarDays } from "lucide-react";
import { AdminLive } from "@/components/domain/admin-live";
import { ParticipantMonitor } from "@/components/domain/participant-monitor";
import { PageHeader } from "@/components/domain/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import type { RoomGame } from "@/components/domain/game-room";
import { gameDetail } from "@/modules/games/detail";
import { monitorGame } from "@/modules/games/lifecycle";
import { pageActor } from "@/lib/page-auth";
import { getDraft } from "@/modules/games/admin";
import { listStudents } from "@/modules/accounts/service";
import { GameEditor } from "@/components/domain/game-editor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { jakarta } from "@/lib/time";
export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const actor = await pageActor(true);
  const game = await getDraft(actor, (await params).gameId);
  const detail = await gameDetail(actor, game.id);
  const monitor = await monitorGame(actor, game.id);
  return (
    <>
      <Link
        href="/admin/games"
        className="inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar game
      </Link>
      <PageHeader
        title={game.title}
        action={<StatusBadge status={detail.status} />}
      />
      {!game.publishedAt ? (
        <GameEditor
          students={await listStudents(actor)}
          draft={{
            id: game.id,
            title: game.title,
            termsText: game.termsText,
            startsAt: game.startsAt.toISOString(),
            endsAt: game.endsAt.toISOString(),
            packages: game.packages,
            userIds: game.whitelist.map((p) => p.userId),
          }}
        />
      ) : (
        <>
          <div className="flex items-start gap-2.5 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
            <LockKeyhole
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p>
              Game sudah diterbitkan. Jadwal, ketentuan, paket, kuota, dan
              daftar peserta terkunci.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Mulai", game.startsAt],
              ["Selesai", game.endsAt],
            ].map(([label, date]) => (
              <div
                key={String(label)}
                className="flex items-center gap-3 rounded-lg border bg-card p-4"
              >
                <CalendarDays
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {String(label)}
                  </p>
                  <p className="mt-1 text-sm font-medium">{jakarta(date)}</p>
                </div>
              </div>
            ))}
          </div>
          <AdminLive initial={JSON.parse(JSON.stringify(detail)) as RoomGame} />
          <ParticipantMonitor
            id={game.id}
            initial={JSON.parse(JSON.stringify(monitor.members))}
          />
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Ketentuan game</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {game.termsText}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
