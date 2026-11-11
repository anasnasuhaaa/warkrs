import Link from "next/link";
import { pageActor } from "@/lib/page-auth";
import { Logout } from "@/components/domain/logout";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor(true);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Admin · {actor.name}</p>
          <nav
            aria-label="Navigasi admin"
            className="mt-3 flex gap-4 text-sm underline"
          >
            <Link href="/admin">Ringkasan</Link>
            <Link href="/admin/students">Mahasiswa</Link>
            <Link href="/admin/games">Game</Link>
          </nav>
        </div>
        <Logout />
      </div>
      {children}
    </>
  );
}
