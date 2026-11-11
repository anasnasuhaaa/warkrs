import { pageActor } from "@/lib/page-auth";
import { listStudents } from "@/modules/accounts/service";
import { StudentImport, ActivationButton } from "@/components/domain/student-import";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export default async function Page() {
  const students = await listStudents(await pageActor(true));
  return <><h1 className="text-3xl font-bold">Akun mahasiswa</h1><StudentImport /><section className="space-y-4"><h2 className="text-xl font-semibold">Daftar akun · {students.length}</h2><Table><TableHeader><TableRow><TableHead>Nama / email</TableHead><TableHead>Status</TableHead><TableHead>Aktivasi</TableHead></TableRow></TableHeader><TableBody>{students.map(s => <TableRow key={s.id}><TableCell><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.email}</p></TableCell><TableCell><Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Aktif" : "Belum aktif"}</Badge></TableCell><TableCell>{!s.active && <ActivationButton userId={s.id} />}</TableCell></TableRow>)}</TableBody></Table>{students.length === 0 && <p className="text-sm text-muted-foreground">Belum ada mahasiswa. Impor akun untuk memulai.</p>}</section></>;
}
