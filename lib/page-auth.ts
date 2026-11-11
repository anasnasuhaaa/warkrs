import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { adminOnly, requireActor } from "@/lib/authorization";
export async function pageActor(admin = false) {
  try { const actor = await requireActor(await headers()); if (admin) adminOnly(actor); return actor; }
  catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    if (error instanceof AppError && error.status === 403) redirect("/games");
    throw error;
  }
}
