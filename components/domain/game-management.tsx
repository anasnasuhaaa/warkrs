"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Download, Trash2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { FieldError } from "./field-error";
import { api, ApiError } from "@/lib/api-client";
import { deleteWarInput } from "@/lib/game-validation";
import { fieldErrors } from "@/lib/form-errors";
import type { GameStatus } from "@/modules/games/status";

export function WarVisibility({ id, isHidden }: { id: string; isHidden: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return <Button variant="outline" size="sm" disabled={pending} onClick={async () => {
    setPending(true);
    try {
      const result = await api<{ isHidden: boolean }>(`/api/admin/games/${id}/visibility`, { isHidden: !isHidden });
      toast.success(result.isHidden ? "War disembunyikan dari daftar mahasiswa." : "War ditampilkan kembali.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Visibilitas gagal diubah."); }
    finally { setPending(false); }
  }}>{isHidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}{pending ? "Menyimpan…" : isHidden ? "Tampilkan War" : "Sembunyikan War"}</Button>;
}
function ExportWar({ id, status }: { id: string; status: GameStatus }) {
  const [pending, setPending] = useState(false);
  return <Button variant="outline" disabled={pending} onClick={async () => {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch(`/api/admin/games/${id}/export`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) { const json = await response.json(); throw new Error(json.error?.message ?? "Ekspor gagal."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="([a-zA-Z0-9_-]+\.xlsx)"/)?.[1] ?? "hasil-war.xlsx";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      if (response.headers.get("X-War-Report-Status") === "final") toast.success("Hasil final siap diunduh.");
      else toast.warning("Laporan sementara siap diunduh; hasil belum final.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Ekspor gagal."); }
    finally { setPending(false); }
  }}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}{pending ? "Menyiapkan hasil…" : "Export Hasil War"}{status !== "Completed" && <span className="sr-only"> (laporan sementara)</span>}</Button>;
}
function DeleteWar({ id, title, status }: { id: string; title: string; status: GameStatus }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [simulationConfirmed, setSimulationConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const running = status === "Live" || status === "Closing";
  const invalid = (field: string) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `delete-${field}-error` : undefined });
  return <AlertDialog open={open} onOpenChange={(value) => {
    if (pending) return;
    setOpen(value);
    if (value) { setConfirmation(""); setReason(""); setSimulationConfirmed(false); setErrors({}); setMessage(""); }
  }}>
    <AlertDialogTrigger asChild><Button variant="destructive" disabled={running} title={running ? "Selesaikan War sebelum menghapus." : undefined}><Trash2 aria-hidden="true" />Hapus War Permanen</Button></AlertDialogTrigger>
    <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
      <AlertDialogHeader>
        <AlertDialogTitle>Hapus War Permanen?</AlertDialogTitle>
        <AlertDialogDescription>War “{title}”, peserta, paket, pengiriman, alokasi, dan lognya akan dihapus. Tindakan ini tidak dapat dibatalkan. Akun mahasiswa tetap disimpan.</AlertDialogDescription>
      </AlertDialogHeader>
      <form noValidate className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setMessage("");
        const parsed = deleteWarInput.safeParse({ confirmation, reason, simulationConfirmed });
        const next = parsed.success ? {} : fieldErrors(parsed.error);
        if (confirmation !== title) next.confirmation = "Ketik judul War persis seperti di atas.";
        setErrors(next);
        if (!parsed.success || Object.keys(next).length) return;
        setPending(true);
        try {
          const result = await api<{ message: string }>(`/api/admin/games/${id}`, parsed.data, "DELETE");
          toast.success(result.message);
          setOpen(false);
          router.replace("/admin/games");
          router.refresh();
        } catch (error) {
          if (error instanceof ApiError) setErrors(error.fields);
          const text = error instanceof Error ? error.message : "War gagal dihapus.";
          toast.error(text); setMessage(text);
        } finally { setPending(false); }
      }}>
        <div className="space-y-2"><Label htmlFor="delete-confirmation">Ketik judul War: {title}</Label><Input id="delete-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={pending} required {...invalid("confirmation")} /><FieldError id="delete-confirmation-error" message={errors.confirmation} /></div>
        <div className="space-y-2"><Label htmlFor="delete-reason">Alasan penghapusan (minimal 10 karakter)</Label><Textarea id="delete-reason" value={reason} onChange={(e) => setReason(e.target.value)} disabled={pending} maxLength={500} required {...invalid("reason")} /><FieldError id="delete-reason-error" message={errors.reason} /></div>
        <div className="space-y-2"><div className="flex items-start gap-3"><Checkbox id="delete-simulation" checked={simulationConfirmed} onCheckedChange={(value) => setSimulationConfirmed(value === true)} disabled={pending} {...invalid("simulationConfirmed")} /><Label htmlFor="delete-simulation" className="min-w-0 text-sm leading-relaxed">Saya memastikan War ini hanya simulasi atau pengujian.</Label></div><FieldError id="delete-simulationConfirmed-error" message={errors.simulationConfirmed} /></div>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Menghapus…" : "Ya, Hapus War Permanen"}</Button></AlertDialogFooter>
      </form>
    </AlertDialogContent>
  </AlertDialog>;
}
export function GameManagement({ id, title, status, isHidden, published }: { id: string; title: string; status: GameStatus; isHidden: boolean; published: boolean }) {
  return <section className="space-y-3" aria-label="Pengelolaan War">
    <div className="flex flex-wrap gap-2">{published && <WarVisibility id={id} isHidden={isHidden} />}<ExportWar id={id} status={status} /><DeleteWar id={id} title={title} status={status} /></div>
    {isHidden && <p className="text-sm text-muted-foreground">Disembunyikan dari daftar mahasiswa. Peserta tetap dapat membuka tautan War.</p>}
    {status !== "Completed" && <p className="text-xs text-muted-foreground">Ekspor saat ini berupa laporan sementara, belum final.</p>}
  </section>;
}
