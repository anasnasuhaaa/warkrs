import Link from "next/link";
import { pageActor } from "@/lib/page-auth";
import { Logout } from "@/components/domain/logout";
import { Brand } from "@/components/domain/brand";
import { Button } from "@/components/ui/button";
import { application } from "@/modules/platform";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-18 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Brand href={actor.role === "ADMIN" ? "/admin" : "/games"} />
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <p
              className="hidden max-w-44 truncate text-sm text-muted-foreground sm:block"
              title={actor.name}
            >
              {actor.name}
            </p>
            {actor.role === "ADMIN" && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            <Logout />
          </div>
        </div>
      </header>
      <main
        id="konten"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
      >
        <div className="page-stack">{children}</div>
      </main>
      <footer className="border-t px-5 py-5 text-center text-xs leading-relaxed text-muted-foreground">
        <p className="mx-auto max-w-2xl">{application.boundary}</p>
      </footer>
    </div>
  );
}
