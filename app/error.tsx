"use client";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Halaman belum dapat dimuat</AlertTitle>
      <AlertDescription>
        Periksa koneksi lalu coba lagi. Pengiriman yang telah diterima server
        tetap tersimpan.
        <Button variant="outline" className="mt-4" onClick={reset}>
          Coba lagi
        </Button>
      </AlertDescription>
    </Alert>
  );
}
