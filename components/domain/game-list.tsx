import Link from "next/link";
import { ArrowUpRight, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";
import type { listGames } from "@/modules/games/queries";
import { jakarta } from "@/lib/time";
type Games = Awaited<ReturnType<typeof listGames>>;
export function GameList({
  games,
  admin = false,
}: {
  games: Games;
  admin?: boolean;
}) {
  if (!games.length)
    return (
      <EmptyState title="Belum ada War">
        {admin
          ? "Buat War untuk mulai menyiapkan jadwal, paket, dan peserta."
          : "War yang ditetapkan admin untukmu akan muncul di sini."}
      </EmptyState>
    );
  return (
    <>
      {admin && (
        <Card className="hidden overflow-hidden py-0 md:flex">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-6">War</TableHead>
                <TableHead>Jadwal (WIB)</TableHead>
                <TableHead className="text-right">Paket</TableHead>
                <TableHead className="text-right">Peserta</TableHead>
                <TableHead className="pr-6 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="max-w-72 whitespace-normal py-5 pl-6">
                    <Link
                      href={`/admin/games/${g.id}`}
                      className="mb-2 block font-medium hover:text-primary"
                    >
                      {g.title}
                    </Link>
                    <StatusBadge status={g.status} />
                  </TableCell>
                  <TableCell className="py-5 text-xs leading-6">
                    <span className="block">{jakarta(g.startsAt)}</span>
                    <span className="block text-muted-foreground">
                      s.d. {jakarta(g.endsAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g.packageCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g.whitelistCount}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/games/${g.id}`}>
                        Buka
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <div
        className={
          admin
            ? "grid gap-4 md:hidden"
            : "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        }
      >
        {games.map((g) => (
          <Card key={g.id} className="justify-between shadow-none">
            <CardHeader className="gap-3">
              <StatusBadge status={g.status} />
              <CardTitle className="text-base font-semibold leading-relaxed">
                {g.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="space-y-2.5 text-sm">
                {[
                  ["Mulai", g.startsAt],
                  ["Selesai", g.endsAt],
                ].map(([label, date]) => (
                  <div
                    key={String(label)}
                    className="flex justify-between gap-4"
                  >
                    <dt className="shrink-0 text-muted-foreground">
                      {String(label)}
                    </dt>
                    <dd className="text-right text-xs leading-6">
                      {jakarta(date)}
                    </dd>
                  </div>
                ))}
              </dl>
              <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {g.packageCount} paket
                  </dt>
                  <dd className="mt-1 font-medium">{g.capacity} total kuota</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {admin ? "Daftar peserta" : "Keikutsertaan"}
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-medium">
                    {admin ? (
                      `${g.whitelistCount} mahasiswa`
                    ) : g.joinedAt ? (
                      <>
                        <CheckCircle2
                          className="size-3.5 text-success"
                          aria-hidden="true"
                        />
                        Bergabung
                      </>
                    ) : (
                      "Belum bergabung"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="justify-between bg-card">
              <Button
                className="w-full justify-between"
                variant="outline"
                asChild
              >
                <Link href={admin ? `/admin/games/${g.id}` : `/games/${g.id}`}>
                  Buka War
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
