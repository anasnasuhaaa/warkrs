"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
export function Logout() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await api("/api/auth/sign-out", {});
            router.push("/login");
            router.refresh();
          } catch {
            setError("Gagal keluar. Coba kembali.");
          }
        }}
      >
        Keluar
      </Button>
      <p role="status" className="text-destructive">
        {error}
      </p>
    </div>
  );
}
