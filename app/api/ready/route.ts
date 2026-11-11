import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
export async function GET() {
  try {
    await getDb().execute(sql`SELECT 1`);
    return Response.json(
      { data: { status: "ready" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: {
          code: "TEMPORARY_FAILURE",
          message: "Database belum tersedia.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
