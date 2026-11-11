import Link from "next/link";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
export default function Admin() {
  return (
    <>
      <h1 className="text-3xl font-bold">Ruang admin</h1>
      <EmptyState title="Persiapkan peserta angkatan">
        Impor akun mahasiswa dan kirim undangan aktivasi melalui halaman
        pengelolaan akun.
      </EmptyState>
      <Button asChild>
        <Link href="/admin/students">Kelola mahasiswa</Link>
      </Button>
    </>
  );
}
