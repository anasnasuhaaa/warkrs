import { pageActor } from "@/lib/page-auth";
import { listStudents } from "@/modules/accounts/service";
import { GameEditor } from "@/components/domain/game-editor";
export default async function Page() {
  return (
    <>
      <h1 className="text-3xl font-bold">Buat game baru</h1>
      <GameEditor students={await listStudents(await pageActor(true))} />
    </>
  );
}
