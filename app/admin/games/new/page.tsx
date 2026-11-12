import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageActor } from "@/lib/page-auth";
import { listStudents } from "@/modules/accounts/service";
import { GameEditor } from "@/components/domain/game-editor";
import { PageHeader } from "@/components/domain/page-header";
export default async function Page() {
  return (
    <>
      <Link
        href="/admin/games"
        className="inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar War
      </Link>
      <PageHeader
        title="Buat War"
        description="Siapkan jadwal, paket, dan daftar peserta. Simpan sebagai draf sebelum diterbitkan."
      />
      <GameEditor students={await listStudents(await pageActor(true))} />
    </>
  );
}
