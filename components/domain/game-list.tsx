import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { listGames } from "@/modules/games/queries";
import { statusLabel } from "@/modules/games/status";
import { jakarta } from "@/lib/time";
export function GameList({
  games,
  admin = false,
}: {
  games: Awaited<ReturnType<typeof listGames>>;
  admin?: boolean;
}) {
  if (!games.length)
    return (
      <EmptyState title="Belum ada game">
        {admin
          ? "Buat game baru untuk simulasi atau war KRS. Setiap game memiliki hasil tersendiri."
          : "Game yang ditetapkan admin untukmu akan muncul di sini."}
      </EmptyState>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {games.map((g) => (
        <Card key={g.id}>
          <CardHeader className="gap-3">
            <Badge variant={g.status === "Live" ? "default" : "secondary"}>
              {statusLabel[g.status]}
            </Badge>
            <CardTitle className="text-xl">{g.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mulai {jakarta(g.startsAt)}
              <br />
              Selesai {jakarta(g.endsAt)}
            </p>
            <p className="text-sm">
              {g.packageCount} paket · {g.capacity} kuota
              {admin && ` · ${g.whitelistCount} daftar peserta`}
            </p>
            {!admin && (
              <p className="text-sm">
                {g.joinedAt ? "Sudah bergabung" : "Belum bergabung"}
              </p>
            )}
            <Button variant="outline" asChild>
              <Link href={admin ? `/admin/games/${g.id}` : `/games/${g.id}`}>
                Buka game
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
