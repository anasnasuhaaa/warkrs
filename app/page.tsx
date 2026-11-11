import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <>
      <section className="max-w-2xl space-y-5">
        <Badge variant="secondary">Kesepakatan paket angkatan</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Satu kesempatan.
          <br />
          Pilihan yang terencana.
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Susun semua paket sesuai pilihanmu saat war dimulai. Alokasi mengikuti
          urutan penerimaan di server dan ketersediaan kuota.
        </p>
        <Button asChild size="lg">
          <Link href="/games">Buka ruang mahasiswa</Link>
        </Button>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          [
            "01 · Bergabung",
            "Akun disediakan admin. Mahasiswa dalam daftar peserta perlu menyetujui ketentuan game.",
          ],
          [
            "02 · Urutkan saat Live",
            "Pilih semua paket satu per satu. Urutan dapat diperbaiki sebelum dikirim.",
          ],
          [
            "03 · Lihat hasil",
            "Satu pengiriman yang diterima menghasilkan satu alokasi tetap. Hasil mengikuti waktu penerimaan server.",
          ],
        ].map(([title, text]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {text}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
