"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { jakarta } from "@/lib/time";
type Member = { id: string; name: string; joinedAt: string | null };
export function ParticipantMonitor({
  id,
  initial,
}: {
  id: string;
  initial: Member[];
}) {
  const [members, setMembers] = useState(initial);
  const [limit, setLimit] = useState(50);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Status peserta</CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                const data = await api<{ members: Member[] }>(
                  `/api/admin/games/${id}/monitor`,
                );
                setMembers(data.members);
                setMessage("Daftar peserta diperbarui.");
              } catch (e) {
                setMessage(
                  e instanceof Error
                    ? e.message
                    : "Daftar belum dapat diperbarui.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            <RefreshCw
              className={`size-3.5 ${pending ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Perbarui
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama mahasiswa</TableHead>
              <TableHead>Keikutsertaan</TableHead>
              <TableHead>Waktu bergabung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.slice(0, limit).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="min-w-36 whitespace-normal py-4 font-medium">
                  {m.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      m.joinedAt
                        ? "bg-success-subtle text-success"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {m.joinedAt ? "Sudah bergabung" : "Belum bergabung"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {m.joinedAt ? jakarta(m.joinedAt) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {members.length > limit && (
          <Button variant="outline" onClick={() => setLimit((n) => n + 50)}>
            Tampilkan peserta berikutnya
          </Button>
        )}
        {!members.length && (
          <p className="section-note">Belum ada peserta terdaftar.</p>
        )}
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
