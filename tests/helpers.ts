import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { user } from "../db/schema";
export function assertTestDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!url.pathname.endsWith("_test"))
    throw new Error("Tests require a dedicated database ending in _test.");
}
assertTestDatabase();
export async function actor(role = "STUDENT", active = true) {
  const id = randomUUID();
  const name = `Fiksi ${id.slice(0, 8)}`;
  await getDb()
    .insert(user)
    .values({
      id,
      name,
      email: `${id}@example.invalid`,
      role,
      emailVerified: active,
    });
  return { id, name, role };
}
export async function dbNow() {
  const result = await getDb().execute(sql`select clock_timestamp() as now`);
  return new Date(result.rows[0].now as string);
}
