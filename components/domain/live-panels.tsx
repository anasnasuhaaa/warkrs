"use client";
import {
  CheckCircle2,
  ArrowRight,
  Send,
  LockKeyhole,
  Flag,
  UsersRound,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { jakarta } from "@/lib/time";
import type { Activity, Snapshot } from "@/hooks/use-game-updates";
type Winner = {
  name: string;
  sequence: number;
  awardedRank: number;
  allocatedAt: string;
};
function Winners({ id, p }: { id: string; p: Snapshot["packages"][number] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Winner[]>([]);
  const [cursor, setCursor] = useState(0);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function load(reset = false) {
    setPending(true);
    setMessage("");
    try {
      const data = await api<{
        items: Winner[];
        cursor: number;
        hasMore: boolean;
      }>(
        `/api/games/${id}/packages?packageId=${p.id}&afterSequence=${reset ? 0 : cursor}&limit=50`,
      );
      setRows((old) =>
        reset
          ? data.items
          : [
              ...old,
              ...data.items.filter(
                (item) => !old.some((r) => r.sequence === item.sequence),
              ),
            ],
      );
      setCursor(data.cursor);
      setMore(data.hasMore);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Pemenang belum tersedia.");
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    if (!open || pending) return;
    let disposed = false;
    const timer = setInterval(async () => {
      try {
        const data = await api<{
          items: Winner[];
          cursor: number;
          hasMore: boolean;
        }>(
          `/api/games/${id}/packages?packageId=${p.id}&afterSequence=${cursor}&limit=50`,
        );
        if (disposed) return;
        setRows((old) => [
          ...old,
          ...data.items.filter(
            (item) => !old.some((r) => r.sequence === item.sequence),
          ),
        ]);
        setCursor(data.cursor);
        setMore(data.hasMore);
      } catch {
        if (!disposed) setMessage("Daftar penerima belum dapat diperbarui.");
      }
    }, 4000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [open, pending, id, p.id, cursor]);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) void load(true);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11 w-full">
          <UsersRound className="size-4" aria-hidden="true" />
          Lihat penerima paket
        </Button>
      </DialogTrigger>
      <DialogContent
        data-winners-id={p.id}
        className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{p.name}</DialogTitle>
          <DialogDescription>
            {p.allocated} dari {p.capacity} kuota teralokasi. Nama hanya
            terlihat oleh peserta yang bergabung dan admin.
          </DialogDescription>
        </DialogHeader>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => load(true)}
        >
          Perbarui daftar
        </Button>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Urutan</TableHead>
              <TableHead>Nama lengkap</TableHead>
              <TableHead>Pilihan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.sequence}>
                <TableCell>#{r.sequence}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.awardedRank}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length && !pending && (
          <p className="text-sm">Belum ada alokasi.</p>
        )}
        {more && (
          <Button variant="outline" disabled={pending} onClick={() => load()}>
            Muat penerima berikutnya
          </Button>
        )}
        <p role="status" className="text-sm">
          {pending ? "Memuat…" : message}
        </p>
      </DialogContent>
    </Dialog>
  );
}
function eventPresentation(event: Activity) {
  if (event.type === "PACKAGE_ALLOCATED")
    return {
      icon: CheckCircle2,
      label: "Teralokasi",
      tone: "bg-success-subtle text-success",
      text: `${event.actorName} mendapat ${event.packageName} (pilihan ${event.rank}).`,
    };
  if (event.type === "PREFERENCE_SKIPPED_FULL")
    return {
      icon: ArrowRight,
      label: "Paket penuh",
      tone: "bg-warning-subtle text-warning",
      text: `${event.packageName} penuh untuk ${event.actorName}; mencoba pilihan berikutnya.`,
    };
  if (event.type === "SUBMISSION_ACCEPTED")
    return {
      icon: Send,
      label: "Pengiriman diterima",
      tone: "bg-muted text-muted-foreground",
      text: `Pengiriman ${event.actorName} diterima.`,
    };
  if (event.type === "GAME_CLOSING")
    return {
      icon: LockKeyhole,
      label: "Pengiriman ditutup",
      tone: "bg-muted text-muted-foreground",
      text: "Game menutup pengiriman baru.",
    };
  return {
    icon: Flag,
    label: event.type === "GAME_COMPLETED" ? "Game selesai" : "Aktivitas game",
    tone: "bg-muted text-muted-foreground",
    text:
      event.type === "GAME_COMPLETED"
        ? "Game selesai. Hasil tetap disimpan."
        : "Aktivitas game dicatat oleh server.",
  };
}
export function LivePanels({
  snapshot,
  events,
  children,
}: {
  snapshot: Snapshot | null;
  events: Activity[];
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(100);
  return (
    <Tabs defaultValue="main" className="min-w-0 gap-5">
      <TabsList className="grid h-auto w-full grid-cols-3 group-data-horizontal/tabs:h-auto rounded-lg border bg-card p-1">
        <TabsTrigger
          className="min-h-11 whitespace-normal px-1 text-xs font-medium data-active:bg-accent data-active:text-primary data-active:shadow-none group-data-[variant=default]/tabs-list:data-active:shadow-none sm:px-3 sm:text-sm"
          value="main"
        >
          Tampilan Utama
        </TabsTrigger>
        <TabsTrigger
          className="min-h-11 whitespace-normal px-1 text-xs font-medium data-active:bg-accent data-active:text-primary data-active:shadow-none group-data-[variant=default]/tabs-list:data-active:shadow-none sm:px-3 sm:text-sm"
          value="packages"
        >
          Daftar Paket
        </TabsTrigger>
        <TabsTrigger
          className="min-h-11 whitespace-normal px-1 text-xs font-medium data-active:bg-accent data-active:text-primary data-active:shadow-none group-data-[variant=default]/tabs-list:data-active:shadow-none sm:px-3 sm:text-sm"
          value="events"
        >
          Log Aktivitas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="main" className="space-y-5">
        {children}
      </TabsContent>
      <TabsContent value="packages" className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Kuota paket</h2>
          <p className="section-note">
            Kuota dan penerima mengikuti hasil yang telah disimpan server.
          </p>
        </div>
        {snapshot ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {snapshot.packages.map((p) => (
              <Card key={p.id} className="justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{p.name}</CardTitle>
                    {p.remaining === 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-warning-subtle text-warning"
                      >
                        Penuh
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <p>
                      <span className="text-2xl font-semibold tabular-nums">
                        {p.allocated}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">
                        / {p.capacity}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.remaining} tersisa
                    </p>
                  </div>
                  <Progress
                    className="h-2"
                    value={(p.allocated / p.capacity) * 100}
                    aria-label={`Kuota terpakai ${p.name}`}
                  />
                  <Winners id={snapshot.game.id} p={p} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div
            className="grid gap-4 sm:grid-cols-2"
            role="status"
            aria-label="Memuat kuota"
          >
            {[0, 1].map((n) => (
              <Skeleton key={n} className="h-52 rounded-lg" />
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="events" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Log aktivitas</h2>
            <p className="section-note">
              Catatan berurutan dari server. Posisi baca tetap saat ada
              pembaruan.
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {events.length} catatan
          </span>
        </div>
        <div
          className="max-h-[30rem] overflow-y-auto overscroll-contain rounded-lg border bg-card"
          tabIndex={0}
          aria-label="Catatan aktivitas game"
        >
          <ol className="divide-y">
            {events.slice(0, visible).map((e) => {
              const view = eventPresentation(e);
              const Icon = view.icon;
              return (
                <li key={e.id} className="flex gap-3 p-4 sm:p-5">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full ${view.tone}`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <article className="min-w-0 space-y-2">
                    <h3 className="text-sm font-medium">{view.label}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {view.text}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-relaxed text-muted-foreground">
                      <time dateTime={e.createdAt} title={e.createdAt}>
                        {jakarta(e.createdAt)}
                      </time>
                      {e.sequence && (
                        <span className="font-medium tabular-nums">
                          Urutan #{e.sequence}
                        </span>
                      )}
                      <span className="tabular-nums">Event {e.id}</span>
                    </p>
                  </article>
                </li>
              );
            })}
          </ol>
          {!events.length && (
            <div className="space-y-2 px-5 py-12 text-center">
              <h3 className="text-sm font-medium">Belum ada aktivitas</h3>
              <p className="text-sm text-muted-foreground">
                Pengiriman dan alokasi yang diterima akan tercatat di sini.
              </p>
            </div>
          )}
        </div>
        {events.length > visible && (
          <Button variant="outline" onClick={() => setVisible((n) => n + 100)}>
            Tampilkan 100 catatan berikutnya
          </Button>
        )}
      </TabsContent>
    </Tabs>
  );
}
