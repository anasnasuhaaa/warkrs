"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Mail, Search, CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
type Row = { row: number; name: string; email: string; status: string };
export function StudentImport() {
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [previewed, setPreviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(50);
  const router = useRouter();
  async function run(preview: boolean) {
    setPending(true);
    setMessage("");
    setError(false);
    try {
      const result = await api<Row[]>("/api/admin/students/import", {
        csv,
        preview,
      });
      setRows(result);
      setPreviewed(preview);
      setVisible(50);
      if (!preview) {
        setMessage(
          "Impor selesai. Akun lama dipertahankan. Kirim aktivasi secara terpisah.",
        );
        router.refresh();
      }
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "Impor gagal.");
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" aria-hidden="true" />
          Impor mahasiswa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Impor mahasiswa</DialogTitle>
          <DialogDescription>
            Tempel CSV dengan kolom name,email. Maksimal 1.000 baris. Akun yang
            sudah ada tidak ditimpa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="field-group">
            <Label htmlFor="csv">CSV mahasiswa</Label>
            <Textarea
              id="csv"
              className="min-h-40 font-mono text-sm"
              value={csv}
              disabled={pending}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreviewed(false);
              }}
              placeholder={"name,email\nMahasiswa Contoh,contoh@example.org"}
              rows={6}
              maxLength={200000}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={pending || !csv}
              onClick={() => run(true)}
            >
              Pratinjau
            </Button>
            <Button disabled={pending || !previewed} onClick={() => run(false)}>
              {pending && (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {pending ? "Memproses…" : "Impor baris valid"}
            </Button>
          </div>
          {message && (
            <Alert variant={error ? "destructive" : "default"} role="status">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {rows.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {rows.length} baris ·{" "}
                {
                  rows.filter(
                    (r) => r.status === "valid" || r.status === "inserted",
                  ).length
                }{" "}
                {previewed ? "baris valid" : "ditambahkan"}
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Baris</TableHead>
                      <TableHead>Mahasiswa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, visible).map((r) => (
                      <TableRow key={r.row}>
                        <TableCell className="tabular-nums">{r.row}</TableCell>
                        <TableCell className="min-w-48 whitespace-normal">
                          <p className="font-medium">{r.name}</p>
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            {r.email}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              r.status === "invalid"
                                ? "bg-destructive/5 text-destructive"
                                : r.status === "inserted"
                                  ? "bg-success-subtle text-success"
                                  : ""
                            }
                          >
                            {
                              {
                                valid: "Valid",
                                invalid: "Tidak valid",
                                duplicate: "Duplikat CSV",
                                existing: "Sudah ada",
                                inserted: "Ditambahkan",
                              }[r.status]
                            }
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > visible && (
                <Button
                  variant="outline"
                  onClick={() => setVisible((n) => n + 50)}
                >
                  Tampilkan baris berikutnya
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function ActivationButton({ userId }: { userId: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          setError(false);
          try {
            const result = await api<{ message: string }>(
              "/api/admin/students/activation-email",
              { userId },
            );
            setMessage(result.message);
          } catch (e) {
            setError(true);
            setMessage(e instanceof Error ? e.message : "Gagal mengirim.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Mail className="size-3.5" aria-hidden="true" />
        )}
        Kirim aktivasi
      </Button>
      {message && (
        <p
          role="status"
          className={`max-w-56 whitespace-normal text-xs leading-relaxed ${error ? "text-destructive" : "text-success"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
export function StudentsTable({
  students,
}: {
  students: { id: string; name: string; email: string; active: boolean }[];
}) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const shown = students.filter((s) =>
    `${s.name} ${s.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="gap-4 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            Daftar mahasiswa{" "}
            <span className="ml-1 font-normal text-muted-foreground">
              ({students.length})
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {students.filter((s) => s.active).length} aktif ·{" "}
            {students.filter((s) => !s.active).length} belum aktif
          </p>
        </div>
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Label className="sr-only" htmlFor="student-search">
            Cari mahasiswa
          </Label>
          <Input
            id="student-search"
            className="pl-9"
            placeholder="Cari nama atau email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(50);
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pl-6">Mahasiswa</TableHead>
              <TableHead>Status akun</TableHead>
              <TableHead className="pr-6">Aktivasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.slice(0, limit).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="min-w-48 whitespace-normal py-4 pl-6">
                  <p className="font-medium">{s.name}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {s.email}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`gap-1.5 ${s.active ? "bg-success-subtle text-success" : "bg-muted text-muted-foreground"}`}
                  >
                    {s.active && (
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                    )}
                    {s.active ? "Aktif" : "Belum aktif"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-6">
                  {s.active ? (
                    <span className="text-sm text-muted-foreground">
                      Selesai
                    </span>
                  ) : (
                    <ActivationButton userId={s.id} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!shown.length && (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {students.length
              ? "Tidak ada mahasiswa yang sesuai."
              : "Belum ada mahasiswa. Impor akun untuk memulai."}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Menampilkan {Math.min(limit, shown.length)} dari {shown.length}{" "}
            mahasiswa
          </p>
          {shown.length > limit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLimit((n) => n + 50)}
            >
              Tampilkan berikutnya
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
