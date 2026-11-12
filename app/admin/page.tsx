import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { pageActor } from "@/lib/page-auth";
import { listStudents } from "@/modules/accounts/service";
import { listGames } from "@/modules/games/queries";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { GameList } from "@/components/domain/game-list";
import { Button } from "@/components/ui/button";
export default async function Admin() {
  const actor = await pageActor(true);
  const [students, games] = await Promise.all([
    listStudents(actor),
    listGames(actor),
  ]);
  const active = students.filter((s) => s.active).length;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan akun dan jadwal War angkatan."
        action={
          <Button asChild>
            <Link href="/admin/games/new">
              <Plus className="size-4" aria-hidden="true" />
              Buat War
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total mahasiswa" value={students.length} />
        <StatCard
          label="Akun aktif"
          value={active}
          detail={`${students.length - active} akun belum aktif`}
        />
        <StatCard
          label="Total War"
          value={games.length}
          detail={`${games.filter((g) => g.status === "Upcoming").length} War akan datang`}
        />
        <StatCard
          label="Sedang berlangsung"
          value={games.filter((g) => g.status === "Live").length}
        />
      </div>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Jadwal War</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/games">
              Semua War
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <GameList games={games.slice(0, 5)} admin />
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">Pengelolaan mahasiswa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Impor akun dan periksa status aktivasi mahasiswa.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/students">
            Kelola mahasiswa
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </>
  );
}
