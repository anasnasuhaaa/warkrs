import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/domain/public-shell";
export default function NotFound() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-lg space-y-5 text-center">
        <h1 className="page-title">Halaman tidak ditemukan</h1>
        <p className="section-note">
          Periksa alamat halaman atau kembali ke daftar War.
        </p>
        <Button asChild>
          <Link href="/games">Buka daftar War</Link>
        </Button>
      </section>
    </PublicShell>
  );
}
