import { pageActor } from "@/lib/page-auth";
import { Logout } from "@/components/domain/logout";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const actor = await pageActor();
  return <><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground">Halo, {actor.name}</p><Logout /></div>{children}</>;
}
