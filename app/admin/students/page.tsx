import { pageActor } from "@/lib/page-auth";
import { listStudents } from "@/modules/accounts/service";
import {
  StudentImport,
  StudentsTable,
} from "@/components/domain/student-import";
import { PageHeader } from "@/components/domain/page-header";
export default async function Page() {
  const students = await listStudents(await pageActor(true));
  return (
    <>
      <PageHeader
        title="Mahasiswa"
        description="Kelola akun dan kirim tautan aktivasi mahasiswa."
        action={<StudentImport />}
      />
      <StudentsTable students={students} />
    </>
  );
}
