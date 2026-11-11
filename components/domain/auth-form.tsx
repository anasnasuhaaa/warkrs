"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api-client";
export function AuthForm({ mode }: { mode: "login" | "activate" | "reset-password" | "forgot-password" }) {
  const [pending, setPending] = useState(false); const [message, setMessage] = useState(""); const [success, setSuccess] = useState(false);
  const token = useRef(""); const router = useRouter();
  useEffect(() => { if (mode === "activate" || mode === "reset-password") { token.current = window.location.hash.slice(1); window.history.replaceState(null, "", window.location.pathname); } }, [mode]);
  const title = { login: "Masuk ke War KRS", activate: "Aktifkan akun", "reset-password": "Atur ulang kata sandi", "forgot-password": "Pulihkan akun" }[mode];
  return <Card className="mx-auto max-w-md"><CardHeader><CardTitle className="text-2xl">{title}</CardTitle><CardDescription>Akun disediakan oleh admin angkatan. Tidak ada pendaftaran mandiri.</CardDescription></CardHeader><CardContent>
    <form className="space-y-5" onSubmit={async (event) => {
      event.preventDefault(); if (pending) return; setPending(true); setMessage("");
      const form = new FormData(event.currentTarget);
      try {
        if (mode === "login") { await api("/api/auth/sign-in/email", { email: String(form.get("email")).trim().toLowerCase(), password: form.get("password") }); router.push("/games"); router.refresh(); }
        else if (mode === "forgot-password") { const result = await api<{message: string}>("/api/auth/request-password-reset", { email: form.get("email") }); setMessage(result.message); setSuccess(true); }
        else { if (form.get("password") !== form.get("confirm")) throw new Error("Konfirmasi kata sandi tidak sama."); const result = await api<{message: string}>(`/api/auth/${mode}`, { token: token.current, password: form.get("password") }); setMessage(result.message); setSuccess(true); }
      } catch (error) { setMessage(error instanceof Error ? error.message : "Permintaan gagal."); } finally { setPending(false); }
    }}>
      {(mode === "login" || mode === "forgot-password") && <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>}
      {mode !== "forgot-password" && <div className="space-y-2"><Label htmlFor="password">Kata sandi {mode !== "login" && "(minimal 12 karakter)"}</Label><Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} maxLength={128} required /></div>}
      {(mode === "activate" || mode === "reset-password") && <div className="space-y-2"><Label htmlFor="confirm">Ulangi kata sandi</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div>}
      <p role="status" aria-live="polite" className={success ? "text-sm text-primary" : "text-sm text-destructive"}>{message}</p>
      <Button className="w-full min-h-11" disabled={pending || success}>{pending ? "Memproses…" : title}</Button>
      <div className="flex flex-wrap justify-between gap-3 text-sm underline"><Link href="/login">Halaman masuk</Link>{mode === "login" && <Link href="/forgot-password">Lupa kata sandi?</Link>}</div>
    </form>
  </CardContent></Card>;
}
