"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { LockKeyhole, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api-client";
export function AuthForm({
  mode,
}: {
  mode: "login" | "activate" | "reset-password" | "forgot-password";
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const token = useRef("");
  const router = useRouter();
  useEffect(() => {
    if (mode === "activate" || mode === "reset-password") {
      token.current = window.location.hash.slice(1);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [mode]);
  const title = {
    login: "Masuk ke War KRS",
    activate: "Aktifkan akun",
    "reset-password": "Atur ulang kata sandi",
    "forgot-password": "Pulihkan akun",
  }[mode];
  return (
    <Card className="mx-auto w-full max-w-md shadow-xs">
      <CardHeader>
        <span className="mb-3 flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Gunakan email dan kata sandi akun yang telah diaktifkan."
            : mode === "forgot-password"
              ? "Masukkan email akunmu untuk menerima tautan pemulihan."
              : "Buat kata sandi untuk mengamankan akunmu."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            setPending(true);
            setMessage("");
            const form = new FormData(event.currentTarget);
            try {
              if (mode === "login") {
                await api("/api/auth/sign-in/email", {
                  email: String(form.get("email")).trim().toLowerCase(),
                  password: form.get("password"),
                });
                router.push("/games");
                router.refresh();
              } else if (mode === "forgot-password") {
                const result = await api<{ message: string }>(
                  "/api/auth/request-password-reset",
                  { email: form.get("email") },
                );
                setMessage(result.message);
                setSuccess(true);
              } else {
                if (form.get("password") !== form.get("confirm"))
                  throw new Error("Konfirmasi kata sandi tidak sama.");
                const result = await api<{ message: string }>(
                  `/api/auth/${mode}`,
                  { token: token.current, password: form.get("password") },
                );
                setMessage(result.message);
                setSuccess(true);
              }
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Permintaan gagal.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          {(mode === "login" || mode === "forgot-password") && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </div>
          )}
          {mode !== "forgot-password" && (
            <div className="space-y-2">
              <Label htmlFor="password">
                Kata sandi {mode !== "login" && "(minimal 12 karakter)"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                required
              />
            </div>
          )}
          {(mode === "activate" || mode === "reset-password") && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Ulangi kata sandi</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </div>
          )}
          <p
            role="status"
            aria-live="polite"
            className={
              success ? "text-sm text-success" : "text-sm text-destructive"
            }
          >
            {message}
          </p>
          <Button className="w-full min-h-11" disabled={pending || success}>
            {pending && (
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {pending ? "Memproses…" : title}
          </Button>
          <div className="flex flex-wrap justify-between gap-3 text-sm text-primary">
            {mode !== "login" && (
              <Link className="rounded-sm hover:underline" href="/login">
                Kembali ke halaman masuk
              </Link>
            )}
            {mode === "login" && (
              <Link
                className="rounded-sm hover:underline"
                href="/forgot-password"
              >
                Lupa kata sandi?
              </Link>
            )}
          </div>
          <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
            Akun hanya disediakan oleh admin angkatan.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
