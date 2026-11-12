import { AuthForm } from "@/components/domain/auth-form";
import { optionalPageActor, actorHome } from "@/lib/page-auth";
import { redirect } from "next/navigation";
export default async function Page() {
  const actor = await optionalPageActor();
  if (actor) redirect(actorHome(actor));
  return <AuthForm mode="login" />;
}
