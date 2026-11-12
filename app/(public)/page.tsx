import Link from "next/link";
import { ArrowRight, Clock3, ListOrdered, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Home() {
  return (
    <div className="mx-auto grid w-full max-w-4xl items-center gap-10 md:grid-cols-[1fr_0.95fr] md:gap-14">
      <section className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-accent-foreground sm:text-5xl">
          War KRS
        </h1>
        <p className="max-w-md text-base leading-8 text-muted-foreground">
          Ikuti War angkatan, urutkan pilihan paket saat war dimulai, dan lihat
          hasil alokasimu.
        </p>
        <Button asChild size="lg">
          <Link href="/login">
            Masuk ke akun
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Gunakan akun yang disediakan admin. Belum menerima tautan aktivasi?
          Hubungi admin angkatan.
        </p>
      </section>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Sebelum mengikuti War</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-6">
            {[
              [
                ShieldCheck,
                "Bergabung secara manual",
                "Baca dan setujui ketentuan War yang tersedia untukmu.",
              ],
              [
                Clock3,
                "Ikuti jadwal war",
                "Pengurutan paket dibuka hanya saat War berlangsung.",
              ],
              [
                ListOrdered,
                "Urutkan seluruh paket",
                "Satu pengiriman yang diterima menghasilkan alokasi tetap berdasarkan urutan penerimaan server.",
              ],
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as typeof ShieldCheck;
              return (
                <li key={String(title)} className="flex gap-3">
                  <ItemIcon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-sm font-medium">{String(title)}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {String(copy)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
