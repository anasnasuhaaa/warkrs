import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="space-y-4 py-12">
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground">
        Periksa alamat halaman atau kembali ke daftar game.
      </p>
      <Button asChild>
        <Link href="/games">Buka daftar game</Link>
      </Button>
    </section>
  );
}
