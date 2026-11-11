import type { Metadata } from "next";
import Link from "next/link";
import { application } from "@/modules/platform";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "War KRS", template: "%s · War KRS" },
  description:
    "Kesepakatan paket KRS angkatan dengan urutan penerimaan server yang transparan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-background focus:p-4"
        >
          Lewati ke konten
        </a>
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/" className="text-xl font-bold tracking-tight">
              War<span className="text-primary"> KRS</span>
            </Link>
            <nav
              aria-label="Navigasi utama"
              className="flex gap-4 text-sm font-medium"
            >
              <Link className="rounded px-2 py-2 hover:bg-muted" href="/games">
                Mahasiswa
              </Link>
              <Link className="rounded px-2 py-2 hover:bg-muted" href="/admin">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main
          id="konten"
          className="mx-auto min-h-[75vh] w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12"
        >
          {children}
        </main>
        <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
          {application.boundary}
        </footer>
      </body>
    </html>
  );
}
