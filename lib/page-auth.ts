import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireActor } from "@/lib/authorization";
export async function pageActor(admin = false) {
  let actor;
  try {
    actor = await requireActor(await headers());
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.status === 401 || error.status === 403)
    )
      redirect("/login");
    throw error;
  }
  if (admin && actor.role !== "ADMIN") redirect("/games");
  return actor;
}

// Validate the current account as well as the session; inactive cookies never redirect.
export async function optionalPageActor() {
  try {
    return await requireActor(await headers());
  } catch (error) {
    if (error instanceof AppError && [401, 403].includes(error.status)) return null;
    throw error;
  }
}
export function actorHome(actor: { role: string } | null) {
  return actor ? (actor.role === "ADMIN" ? "/admin" : "/games") : "/login";
}
