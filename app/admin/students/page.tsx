import { pageActor } from "@/lib/page-auth";
import { listStudents } from "@/modules/accounts/service";
import {
  StudentActions,
  StudentsTable,
} from "@/components/domain/student-management";
import { PageHeader } from "@/components/domain/page-header";
export default async function Page() {
  const students = await listStudents(await pageActor(true));
  return (
    <>
      <PageHeader
        className="sm:flex-col xl:flex-row"
        title="Mahasiswa"
        description="Kelola akun dan kirim tautan aktivasi mahasiswa."
        action={<StudentActions />}
      />
      <StudentsTable students={students} />
    </>
  );
}
