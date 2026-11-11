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
