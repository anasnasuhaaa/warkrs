"use client";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, FileSpreadsheet, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import type { ImportRow } from "@/modules/accounts/excel";
type ImportResult = {
  rows: ImportRow[];
  summary: {
    total: number;
    inserted: number;
    existing: number;
    duplicate: number;
    invalid: number;
  };
};
export function TemplateButton() {
  return (
    <Button variant="outline" asChild>
      <a href="/api/admin/students/template" download="template-mahasiswa.xlsx">
        <Download className="size-4" aria-hidden="true" />
        Unduh Template
      </a>
    </Button>
  );
}
export function StudentImport() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(50);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" aria-hidden="true" />
          Impor Excel
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl"
        onInteractOutside={(e) => {
          if (pending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Impor Excel</DialogTitle>
          <DialogDescription>
            Unggah .xlsx dengan kolom no, nama, nim, email. Maksimal 1.000
            mahasiswa dan 2 MB. Isi NIM sebagai teks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <TemplateButton />
          <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-4">
            <Label htmlFor="student-excel">Berkas Excel mahasiswa</Label>
            <Input
              ref={fileInput}
              id="student-excel"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={pending}
              onChange={(e) => {
                setResult(null);
                setMessage("");
                const selected = e.target.files?.[0] ?? null;
                if (
                  selected &&
                  (!/\.xlsx$/i.test(selected.name) ||
                    selected.size > 2 * 1024 * 1024)
                ) {
                  setFile(null);
                  setMessage("Pilih berkas .xlsx berukuran maksimal 2 MB.");
                  return;
                }
                setFile(selected);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="size-4" aria-hidden="true" />
              {file ? "Ganti Berkas" : "Pilih Berkas .xlsx"}
            </Button>
            {file && (
              <p className="flex items-start gap-2 text-sm" aria-live="polite">
                <FileSpreadsheet
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="break-all">{file.name}</span>
              </p>
            )}
          </div>
          <Button
            disabled={!file || pending}
            onClick={async () => {
              if (!file) return;
              setPending(true);
              setMessage("");
              setResult(null);
              try {
                const data = new FormData();
                data.append("file", file);
                setResult(
                  await api<ImportResult>("/api/admin/students/import", data),
                );
                toast.success("Impor selesai. Periksa ringkasan hasil.");
                setVisible(50);
                setFile(null);
                if (fileInput.current) fileInput.current.value = "";
                router.refresh();
              } catch (e) {
            toast.error(e instanceof Error ? e.message : "Email gagal dikirim.");
                toast.error(e instanceof Error ? e.message : "Impor gagal.");
                setMessage(
                  e instanceof Error ? e.message : "Impor gagal. Coba kembali.",
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
            {pending ? "Mengimpor…" : "Impor Mahasiswa"}
          </Button>
          {pending && (
            <p role="status" className="text-sm text-muted-foreground">
              Memvalidasi dan menyimpan data mahasiswa…
            </p>
          )}
          {message && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {result && (
            <div className="space-y-4">
              <div
                role="status"
                className="rounded-lg border bg-muted/30 p-4 text-sm leading-7"
              >
                <p className="font-medium">
                  {result.summary.total} baris diproses
                </p>
                <p>
                  {result.summary.inserted} ditambahkan ·{" "}
                  {result.summary.existing} sudah terdaftar ·{" "}
                  {result.summary.duplicate} duplikat berkas ·{" "}
                  {result.summary.invalid} tidak valid
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Akun baru belum aktif. Kirim email aktivasi melalui daftar
                mahasiswa.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.slice(0, visible).map((r) => (
                    <TableRow key={r.row}>
                      <TableCell>{r.row}</TableCell>
                      <TableCell className="min-w-48 whitespace-normal">
                        <p className="font-medium">{r.name || "—"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.nim || "NIM kosong"}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {r.email || "Email kosong"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            r.status === "inserted"
                              ? "bg-success-subtle text-success"
                              : r.status === "invalid"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-warning-subtle text-warning"
                          }
                        >
                          {
                            {
                              valid: "Valid",
                              inserted: "Ditambahkan",
                              invalid: "Tidak valid",
                              duplicate: "Duplikat",
                              existing: "Sudah terdaftar",
                            }[r.status]
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-56 whitespace-normal text-sm leading-relaxed">
                        {r.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.rows.length > visible && (
                <Button
                  variant="outline"
                  onClick={() => setVisible((n) => n + 50)}
                >
                  Tampilkan berikutnya
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function ActivationButton({ userId }: { userId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          try {
            const result = await api<{ message: string }>(
              "/api/admin/students/activation-email",
              { userId },
            );
            toast.success(result.message);
            setMessage(result.message);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Email gagal dikirim.");
            setMessage(e instanceof Error ? e.message : "Email gagal dikirim.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending && (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        )}
        {pending ? "Mengirim…" : "Kirim aktivasi"}
      </Button>
      {message && (
        <p
          role="status"
          className="max-w-64 whitespace-normal text-xs leading-relaxed text-muted-foreground"
        >
          {message}
        </p>
      )}
    </div>
  );
}
