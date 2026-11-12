"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Search,
  Save,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api-client";
import { jakartaInput, fromJakartaInput } from "@/lib/time";
import { GameDateTimeField } from "./game-date-time-field";
type Draft = {
  id: string;
  title: string;
  termsText: string;
  startsAt: string;
  endsAt: string;
  packages: { name: string; capacity: number }[];
  userIds: string[];
};
type Student = {
  id: string;
  name: string;
  nim: string | null;
  email: string;
  active: boolean;
};
export function GameEditor({
  draft,
  students,
}: {
  draft?: Draft;
  students: Student[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(draft?.title ?? "");
  const [terms, setTerms] = useState(draft?.termsText ?? "");
  const [start, setStart] = useState(draft ? jakartaInput(draft.startsAt) : "");
  const [end, setEnd] = useState(draft ? jakartaInput(draft.endsAt) : "");
  const [ps, setPs] = useState(draft?.packages ?? [{ name: "", capacity: 1 }]);
  const [ids, setIds] = useState<string[]>(draft?.userIds ?? []);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(100);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(Boolean(draft));
  const capacity = ps.reduce((n, p) => n + (Number(p.capacity) || 0), 0);
  const visible = students.filter((s) =>
    `${s.name} ${s.nim ?? ""} ${s.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const scheduleValid = Boolean(start && end && end > start);
  const packagesValid =
    ps.length > 0 &&
    ps.every(
      (p) => p.name.trim() && p.capacity > 0 && Number.isInteger(p.capacity),
    ) &&
    new Set(ps.map((p) => p.name.trim().normalize("NFKC").toLowerCase()))
      .size === ps.length;
  const ready = Boolean(
    title.trim() &&
    terms.trim() &&
    scheduleValid &&
    packagesValid &&
    ids.length > 0 &&
    capacity >= ids.length,
  );
  return (
    <form
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        setPending(true);
        setMessage("");
        setError(false);
        try {
          if (!start || !end)
            throw new Error("Pilih tanggal dan waktu mulai serta selesai.");
          if (!scheduleValid)
            throw new Error("Waktu selesai harus setelah waktu mulai.");
          const payload = {
            title,
            termsText: terms,
            startsAt: fromJakartaInput(start),
            endsAt: fromJakartaInput(end),
            packages: ps,
            userIds: ids,
          };
          const result = await api<{ id: string }>(
            draft ? `/api/admin/games/${draft.id}` : "/api/admin/games",
            payload,
            draft ? "PATCH" : "POST",
          );
          setSaved(true);
          setMessage("Draf tersimpan.");
          if (!draft) router.push(`/admin/games/${result.id}`);
        } catch (e) {
          setError(true);
          setMessage(e instanceof Error ? e.message : "Draf gagal disimpan.");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Informasi War</CardTitle>
            <CardDescription>
              Gunakan judul yang membedakan simulasi dan war KRS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="field-group">
              <Label htmlFor="title">Judul War</Label>
              <Input
                id="title"
                name="title"
                placeholder="Contoh: War KRS Semester 4"
                value={title}
                required
                maxLength={150}
                disabled={pending}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Jadwal</CardTitle>
            <CardDescription>
              Seluruh waktu menggunakan zona waktu Jakarta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <GameDateTimeField
              id="start"
              label="Mulai"
              value={start}
              disabled={pending}
              invalid={error && !scheduleValid}
              onChange={(v) => {
                setStart(v);
                setSaved(false);
              }}
            />
            <GameDateTimeField
              id="end"
              label="Selesai"
              value={end}
              disabled={pending}
              invalid={error && !scheduleValid}
              onChange={(v) => {
                setEnd(v);
                setSaved(false);
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Ketentuan War</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="terms">
              Ketentuan yang perlu disetujui peserta
            </Label>
            <Textarea
              id="terms"
              name="terms"
              value={terms}
              disabled={pending}
              maxLength={10000}
              rows={6}
              placeholder="Tuliskan aturan dan informasi penting untuk peserta."
              onChange={(e) => {
                setTerms(e.target.value);
                setSaved(false);
              }}
            />
            <p className="section-note">
              Pemberitahuan visibilitas nama lengkap dan urutan penerimaan
              server ditampilkan bersama ketentuan saat bergabung.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Paket dan kuota</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || ps.length >= 50}
                onClick={() => {
                  setPs([...ps, { name: "", capacity: 1 }]);
                  setSaved(false);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Tambah paket
              </Button>
            </div>
            <CardDescription>
              Nama paket harus berbeda. Kuota diisi dengan jumlah tempat
              tersedia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ps.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_5rem_2.5rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_2.5rem]"
              >
                <div className="field-group">
                  <Label htmlFor={`package-${i}`}>Nama paket {i + 1}</Label>
                  <Input
                    id={`package-${i}`}
                    value={p.name}
                    disabled={pending}
                    required
                    maxLength={100}
                    onChange={(e) => {
                      setPs(
                        ps.map((v, j) =>
                          j === i ? { ...v, name: e.target.value } : v,
                        ),
                      );
                      setSaved(false);
                    }}
                  />
                </div>
                <div className="field-group">
                  <Label htmlFor={`quota-${i}`}>Kuota</Label>
                  <Input
                    id={`quota-${i}`}
                    type="number"
                    inputMode="numeric"
                    value={p.capacity}
                    min={1}
                    max={100000}
                    disabled={pending}
                    required
                    onChange={(e) => {
                      setPs(
                        ps.map((v, j) =>
                          j === i
                            ? { ...v, capacity: Number(e.target.value) }
                            : v,
                        ),
                      );
                      setSaved(false);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                  aria-label={`Hapus paket ${i + 1}`}
                  disabled={pending}
                  onClick={() => {
                    setPs(ps.filter((_, j) => j !== i));
                    setSaved(false);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            {!ps.length && (
              <p className="section-note">
                Belum ada paket. Tambahkan paket sebelum menerbitkan War.
              </p>
            )}
            <div className="flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                Total kuota · {ps.length} paket
              </span>
              <span className="font-semibold tabular-nums">{capacity}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Daftar peserta</CardTitle>
              <span className="text-sm font-medium tabular-nums">
                {ids.length} dipilih
              </span>
            </div>
            <CardDescription>
              Mahasiswa terdaftar tetap perlu bergabung dan menyetujui
              ketentuan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Label htmlFor="search" className="sr-only">
                Cari nama atau email
              </Label>
              <Input
                id="search"
                className="pl-9"
                placeholder="Cari nama atau email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(100);
                }}
              />
            </div>
            <div className="flex min-h-12 items-center gap-3 rounded-md bg-muted px-3">
              <Checkbox
                id="all"
                disabled={pending || students.length === 0}
                checked={
                  students.length > 0 && ids.length === students.length
                    ? true
                    : ids.length > 0
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(v) => {
                  setIds(v === true ? students.map((s) => s.id) : []);
                  setSaved(false);
                }}
              />
              <Label htmlFor="all" className="flex-1 py-3 leading-relaxed">
                Pilih semua mahasiswa{" "}
                <span className="whitespace-nowrap text-muted-foreground">
                  ({students.length})
                </span>
              </Label>
            </div>
            <div
              className="relative max-h-88 overflow-y-auto rounded-md border"
              tabIndex={0}
              aria-label="Pilihan mahasiswa"
            >
              {visible.slice(0, visibleCount).map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 border-b px-3 last:border-b-0 hover:bg-muted/40"
                >
                  <Checkbox
                    id={s.id}
                    className="mt-4"
                    disabled={pending}
                    checked={ids.includes(s.id)}
                    onCheckedChange={(v) => {
                      setIds(
                        v === true
                          ? [...ids, s.id]
                          : ids.filter((id) => id !== s.id),
                      );
                      setSaved(false);
                    }}
                  />
                  <Label
                    htmlFor={s.id}
                    className="block min-w-0 flex-1 cursor-pointer py-3 leading-relaxed"
                  >
                    <span className="block font-medium">{s.name}</span>
                    <span className="mt-0.5 block break-all text-xs font-normal text-muted-foreground">
                      {s.email} · {s.active ? "Aktif" : "Belum aktif"}
                    </span>
                  </Label>
                </div>
              ))}
              {!visible.length && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada mahasiswa yang sesuai.
                </p>
              )}
            </div>
            {visible.length > visibleCount && (
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => setVisibleCount((n) => n + 100)}
              >
                Tampilkan lebih banyak
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-24">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Ringkasan War</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="space-y-3 text-sm">
              {[
                ["Paket", ps.length],
                ["Total kuota", capacity],
                ["Peserta", ids.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <div
              className={`flex gap-2 rounded-md p-3 text-sm leading-relaxed ${ready ? "bg-success-subtle text-success" : "bg-muted text-muted-foreground"}`}
            >
              {ready ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              <p>
                {capacity < ids.length
                  ? "Kuota belum mencukupi seluruh peserta."
                  : ready
                    ? "Konfigurasi lengkap untuk diterbitkan."
                    : "Lengkapi jadwal, ketentuan, paket, dan daftar peserta sebelum publikasi."}
              </p>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {saved ? (
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              ) : (
                <span
                  className="size-1.5 rounded-full bg-warning"
                  aria-hidden="true"
                />
              )}
              {saved ? "Perubahan tersimpan" : "Ada perubahan belum disimpan"}
            </p>
            <Button type="submit" className="h-11 w-full" disabled={pending}>
              {pending ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {pending ? "Menyimpan…" : "Simpan draf"}
            </Button>
            {message && (
              <Alert variant={error ? "destructive" : "default"} role="status">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        {draft && (
          <PublishGame id={draft.id} disabled={!saved || !ready || pending} />
        )}
      </aside>
    </form>
  );
}
export function PublishGame({
  id,
  disabled = false,
}: {
  id: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          Publikasi
        </CardTitle>
        <CardDescription>
          Jadwal, ketentuan, paket, kuota, dan daftar peserta akan terkunci
          setelah diterbitkan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          className="h-11 w-full"
          variant="outline"
          disabled={disabled || pending}
          onClick={async () => {
            setPending(true);
            try {
              await api(`/api/admin/games/${id}/publish`, {});
              router.refresh();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Publikasi gagal.");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "Menerbitkan…" : "Publikasikan War"}
        </Button>
        {disabled && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Lengkapi dan simpan draf terlebih dahulu.
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-destructive">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
