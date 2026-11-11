"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api-client";
type Row = { row: number; name: string; email: string; status: string };
export function StudentImport() {
  const [csv, setCsv] = useState(""); const [rows, setRows] = useState<Row[]>([]); const [previewed, setPreviewed] = useState(false); const [pending, setPending] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  async function run(preview: boolean) { setPending(true); setMessage(""); try { const result = await api<Row[]>("/api/admin/students/import", { csv, preview }); setRows(result); setPreviewed(preview); if (!preview) { setMessage("Impor selesai. Akun lama dipertahankan. Kirim aktivasi secara terpisah."); router.refresh(); } } catch (e) { setMessage(e instanceof Error ? e.message : "Impor gagal."); } finally { setPending(false); } }
  return <section className="space-y-4"><h2 className="text-xl font-semibold">Impor mahasiswa</h2><p className="text-sm text-muted-foreground">Tempel CSV dengan kolom name,email. Maksimal 1.000 baris. Akun yang sudah ada tidak ditimpa. Email aktivasi dikirim secara terpisah.</p>
    <Label htmlFor="csv">CSV mahasiswa</Label><Textarea id="csv" value={csv} onChange={(e) => { setCsv(e.target.value); setPreviewed(false); }} placeholder={'name,email\nMahasiswa Contoh,contoh@example.org'} rows={5} maxLength={200000} />
    <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={pending || !csv} onClick={() => run(true)}>Pratinjau</Button><Button disabled={pending || !previewed} onClick={() => run(false)}>{pending ? "Memproses…" : "Impor baris valid"}</Button></div><p role="status" className="text-sm">{message}</p>
    {rows.length > 0 && <Table><TableHeader><TableRow><TableHead>Baris</TableHead><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.map(r => <TableRow key={r.row}><TableCell>{r.row}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.email}</TableCell><TableCell>{{ valid: "Valid", invalid: "Tidak valid", duplicate: "Duplikat CSV", existing: "Sudah ada", inserted: "Ditambahkan" }[r.status]}</TableCell></TableRow>)}</TableBody></Table>}
  </section>;
}
export function ActivationButton({ userId }: { userId: string }) {
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  return <div><Button variant="outline" size="sm" disabled={pending} onClick={async () => { setPending(true); try { const result = await api<{message:string}>("/api/admin/students/activation-email", { userId }); setMessage(result.message); } catch (e) { setMessage(e instanceof Error ? e.message : "Gagal mengirim."); } finally { setPending(false); } }}>Kirim aktivasi</Button><p role="status" className="mt-1 text-sm">{message}</p></div>;
}
