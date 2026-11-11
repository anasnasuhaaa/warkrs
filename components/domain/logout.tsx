"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { api } from "@/lib/api-client";
export function Logout({ sidebar = false }: { sidebar?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await api("/api/auth/sign-out", {});
      router.push("/login");
      router.refresh();
    } catch {
      setError("Gagal keluar. Coba kembali.");
      setPending(false);
    }
  }
  const content = (
    <>
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      <span>Keluar</span>
    </>
  );
  return (
    <div className="min-w-0">
      {sidebar ? (
        <SidebarMenuButton
          className="h-10"
          tooltip="Keluar"
          disabled={pending}
          onClick={logout}
        >
          {content}
        </SidebarMenuButton>
      ) : (
        <Button variant="ghost" size="sm" disabled={pending} onClick={logout}>
          {content}
        </Button>
      )}
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
