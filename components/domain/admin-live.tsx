"use client";
import { useGameUpdates } from "@/hooks/use-game-updates";
import { LivePanels } from "./live-panels";
import { EndGame } from "./end-game";
import type { RoomGame } from "./game-room";
import { statusLabel } from "@/modules/games/status";
export function AdminLive({ initial }: { initial: RoomGame }) {
  const { game, snapshot, events, connection, refresh } = useGameUpdates(
    initial,
    true,
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{statusLabel[game.status]}</h2>
        {game.status === "Live" && (
          <EndGame id={game.id} onEnded={() => void refresh()} />
        )}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {connection}
      </p>
      {snapshot && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Daftar peserta", snapshot.counts.whitelisted],
            ["Bergabung", snapshot.counts.joined],
            ["Belum bergabung", snapshot.counts.notJoined],
            ["Mengirim", snapshot.counts.submitted],
            ["Teralokasi", snapshot.counts.allocated],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}
      <LivePanels snapshot={snapshot} events={events}>
        <p className="text-sm text-muted-foreground">
          Pantau kuota dan log pada tab di atas. Konfigurasi yang diterbitkan
          tetap terkunci; hasil game tidak dapat direset.
        </p>
      </LivePanels>
    </section>
  );
}
