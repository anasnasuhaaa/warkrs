"use client";
import Link from "next/link";
import { LivePanels } from "./live-panels";
import { useGameUpdates } from "@/hooks/use-game-updates";
import { Ranking } from "./ranking";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "./status-badge";
import { ConnectionStatus } from "./connection-status";
import { api } from "@/lib/api-client";
import { jakarta } from "@/lib/time";
import { consentNotice } from "@/modules/games/terms";
import type { GameStatus } from "@/modules/games/status";
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
      <Link
        href="/games"
        className="inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar game
      </Link>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={game.status} />
          <ConnectionStatus message={connection} />
        </div>
        <h1 className="page-title">{game.title}</h1>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="size-4" aria-hidden="true" />
              Mulai
            </dt>
            <dd className="mt-1 font-medium">{jakarta(game.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Selesai</dt>
            <dd className="mt-1 font-medium">{jakarta(game.endsAt)}</dd>
          </div>
        </dl>
      </section>
      {game.status === "Upcoming" && (
        <Card>
          <CardContent className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h2 className="text-base font-medium">War belum dimulai</h2>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Pilihan paket dibuka setelah server menyatakan game berlangsung.
              </p>
            </div>
            <div
              role="timer"
              aria-label="Hitung mundur menuju waktu mulai"
              className="flex shrink-0 gap-3 sm:gap-5"
            >
              {[
                [Math.floor(seconds / 3600), "Jam"],
                [Math.floor((seconds % 3600) / 60), "Menit"],
                [seconds % 60, "Detik"],
              ].map(([value, label]) => (
                <div key={String(label)} className="min-w-14 text-center">
                  <span className="block text-3xl font-semibold tracking-tight tabular-nums text-accent-foreground">
                    {String(value).padStart(2, "0")}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {!game.joinedAt && !closed && (
        <Card className="mx-auto w-full max-w-3xl">
          <CardHeader className="border-b">
            <CardTitle>Bergabung ke game</CardTitle>
            <CardDescription>
              Baca ketentuan berikut sebelum memberikan persetujuan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="whitespace-pre-wrap text-sm leading-7">
              {game.termsText}
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <LockKeyhole
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                Privasi dan pengiriman
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                {consentNotice}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                id="consent"
                className="mt-1"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                disabled={pending}
              />
              <Label
                htmlFor="consent"
                className="cursor-pointer text-sm font-normal leading-7"
              >
                Saya telah membaca dan menyetujui ketentuan serta pemberitahuan
                nama lengkap di atas.
              </Label>
            </div>
            <Button
              className="h-11 w-full sm:w-auto"
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
              {pending && (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {pending ? "Bergabung…" : "Gabung game"}
            </Button>
            {message && (
              <Alert variant="destructive" role="status">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
      {game.joinedAt && (
        <>
          <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            Anda sudah bergabung dan menyetujui ketentuan game.
          </p>
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
        </>
      )}
      {closed && (
        <div className="flex items-start gap-3 rounded-lg border bg-card p-5">
          <LockKeyhole
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-medium">
              {game.status === "Completed"
                ? "Game selesai"
                : "Game sedang ditutup"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Pengiriman baru telah ditutup. Hasil yang diterima tetap disimpan.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
