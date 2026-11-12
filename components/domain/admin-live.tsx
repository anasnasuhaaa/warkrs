"use client";
import { useGameUpdates } from "@/hooks/use-game-updates";
import { LivePanels } from "./live-panels";
import { EndGame } from "./end-game";
import { ConnectionStatus } from "./connection-status";
import { StatCard } from "./stat-card";
import type { RoomGame } from "./game-room";
import { statusLabel } from "@/modules/games/status";
import { Skeleton } from "@/components/ui/skeleton";
export function AdminLive({ initial }: { initial: RoomGame }) {
  const { game, snapshot, events, connection, refresh } = useGameUpdates(
    initial,
    true,
  );
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold">
            {statusLabel[game.status]}
          </h2>
          <ConnectionStatus message={connection} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {snapshot
          ? [
              ["Daftar peserta", snapshot.counts.whitelisted],
              ["Bergabung", snapshot.counts.joined],
              ["Belum bergabung", snapshot.counts.notJoined],
              ["Mengirim", snapshot.counts.submitted],
              ["Teralokasi", snapshot.counts.allocated],
            ].map(([label, value]) => (
              <StatCard
                key={label}
                label={String(label)}
                value={Number(value)}
              />
            ))
          : [0, 1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-28 rounded-lg" />
            ))}
      </div>
      <LivePanels snapshot={snapshot} events={events}>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-medium">Pemantauan War</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Lihat kuota, penerima paket, dan urutan pengiriman pada tab di atas.
            Konfigurasi War yang diterbitkan tetap terkunci.
          </p>
        </div>
      </LivePanels>
      {game.status === "Live" && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-medium">Penghentian War</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Akhiri lebih awal hanya jika diperlukan. Pengiriman yang telah
              diterima tetap disimpan.
            </p>
          </div>
          <EndGame id={game.id} onEnded={() => void refresh()} />
        </div>
      )}
    </section>
  );
}
