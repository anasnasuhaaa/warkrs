"use client";
import { LivePanels } from "./live-panels";
import { useGameUpdates } from "@/hooks/use-game-updates";
import { Ranking } from "./ranking";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { jakarta } from "@/lib/time";
import { consentNotice } from "@/modules/games/terms";
import { statusLabel, type GameStatus } from "@/modules/games/status";
export type RoomGame = {
  id: string;
  title: string;
  termsText: string;
  termsVersion: string;
  startsAt: string;
  endsAt: string;
  serverNow: string;
  status: GameStatus;
  joinedAt: string | null;
  packages: { id: string; name: string; capacity: number }[];
};
export function GameRoom({ initial }: { initial: RoomGame }) {
  const { game, snapshot, events, connection, refresh } =
    useGameUpdates(initial);
  const [now, setNow] = useState(new Date(initial.serverNow).getTime());
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const stale = connection !== "Tersinkron dengan server";
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(
      () =>
        setNow(
          new Date(game.serverNow).getTime() + performance.now() - started,
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [game.serverNow]);
  const seconds = Math.max(
    0,
    Math.ceil((new Date(game.startsAt).getTime() - now) / 1000),
  );
  const closed = game.status === "Closing" || game.status === "Completed";
  return (
    <>
      <div className="space-y-3">
        <Badge variant={game.status === "Live" ? "default" : "secondary"}>
          {statusLabel[game.status]}
        </Badge>
        <h1 className="text-3xl font-bold">{game.title}</h1>
        <p className="text-sm text-muted-foreground">
          {jakarta(game.startsAt)} – {jakarta(game.endsAt)}
        </p>
        <p role="status" className="text-sm">
          {connection}
        </p>
      </div>
      {game.status === "Upcoming" && (
        <Card>
          <CardHeader>
            <CardTitle>War belum dimulai</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {Math.floor(seconds / 3600)}j {Math.floor((seconds % 3600) / 60)}m{" "}
              {seconds % 60} detik
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Hitung mundur bersifat informatif. Pilihan paket baru tersedia
              setelah server menyatakan Live.
            </p>
          </CardContent>
        </Card>
      )}
      {!game.joinedAt && !closed && (
        <Card>
          <CardHeader>
            <CardTitle>Baca ketentuan sebelum bergabung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {game.termsText}
            </p>
            <p className="rounded-lg bg-muted p-4 text-sm leading-relaxed">
              {consentNotice}
            </p>
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                disabled={pending}
              />
              <Label htmlFor="consent" className="leading-relaxed">
                Saya telah membaca dan menyetujui ketentuan serta pemberitahuan
                nama lengkap di atas.
              </Label>
            </div>
            <Button
              className="min-h-11"
              disabled={!accepted || pending || stale}
              onClick={async () => {
                setPending(true);
                setMessage("");
                try {
                  await api(`/api/games/${game.id}/join`, {
                    accepted: true,
                    acceptedTermsVersion: game.termsVersion,
                  });
                  await refresh();
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : "Gagal bergabung.",
                  );
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Bergabung…" : "Gabung game"}
            </Button>
            <p role="status" className="text-sm text-destructive">
              {message}
            </p>
          </CardContent>
        </Card>
      )}
      {game.joinedAt && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          Anda sudah bergabung dan menyetujui ketentuan game.
        </p>
      )}
      {game.joinedAt && (
        <LivePanels snapshot={snapshot} events={events}>
          <Ranking
            id={game.id}
            packages={game.packages}
            live={game.status === "Live"}
            stale={stale}
            authoritativeResult={snapshot?.ownSubmission}
            onAccepted={() => void refresh()}
          />
        </LivePanels>
      )}
      {closed ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {game.status === "Completed"
                ? "Game selesai"
                : "Game sedang ditutup"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            Pengiriman baru telah ditutup. Hasil yang diterima tetap disimpan.
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
