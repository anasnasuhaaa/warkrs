import "server-only";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import { invariant } from "@/lib/errors";
export type Actor = { id: string; name: string; role: string };
export async function requireActor(requestHeaders: Headers): Promise<Actor> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  invariant(session, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu.", 401);
  const [current] = await getDb().select({ id: user.id, name: user.name, role: user.role, active: user.emailVerified }).from(user).where(eq(user.id, session.user.id));
  invariant(current?.active, "FORBIDDEN", "Akun belum aktif.", 403);
  return { id: current.id, name: current.name, role: current.role };
}
export function adminOnly(actor: Actor) { invariant(actor.role === "ADMIN", "FORBIDDEN", "Akses khusus admin.", 403); }
