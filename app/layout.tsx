import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});
export const metadata: Metadata = {
  title: { default: "War KRS", template: "%s · War KRS" },
  description: "Pengelolaan dan pemilihan paket KRS angkatan.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${poppins.variable} min-h-full antialiased`}>
      <body className="min-h-dvh">
        <a
          href="#konten"
          className="sr-only rounded-md focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-card focus:p-3 focus:shadow-sm"
        >
          Lewati ke konten
        </a>
        {children}
        <Toaster position="top-right" duration={2000} closeButton={false} richColors />
      </body>
    </html>
  );
}
