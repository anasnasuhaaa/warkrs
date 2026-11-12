"use client";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { endWarInput } from "@/lib/game-validation";
import { api } from "@/lib/api-client";
export function EndGame({ id, onEnded }: { id: string; onEnded?: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Akhiri war</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Akhiri war sekarang?</AlertDialogTitle>
          <AlertDialogDescription>
            Pengiriman baru akan ditolak. Semua hasil yang telah diterima tetap
            disimpan. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="end-reason">
            Alasan penghentian (minimal 10 karakter)
          </Label>
          <Textarea
            id="end-reason"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(message)}
            aria-describedby="end-error"
            required
          />
          <p id="end-error" role="status" className="text-sm text-destructive">
            {message}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending || reason.trim().length < 10}
            onClick={async () => {
              const parsed = endWarInput.safeParse({ reason, confirmed: true });
              if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
              setMessage("");
              setPending(true);
              try {
                await api(`/api/admin/games/${id}/end`, {
                  reason,
                  confirmed: true,
                });
                toast.success("War diakhiri.");
                setOpen(false);
                if (onEnded) onEnded();
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Gagal mengakhiri War.");
                setMessage(
                  e instanceof Error ? e.message : "Gagal mengakhiri.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Menutup…" : "Ya, akhiri war"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
