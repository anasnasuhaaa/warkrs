import { pageActor } from "@/lib/page-auth";
import { AdminShell } from "@/components/domain/admin-shell";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor(true);
  return <AdminShell name={actor.name}>{children}</AdminShell>;
}
