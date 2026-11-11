import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { readDatabaseUrl } from "@/lib/config";

// Lazy initialization: static builds do not need database credentials.
// Only connections are cached; all application state lives in PostgreSQL.
let pool: Pool | undefined;
let database: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (!database) {
    pool = new Pool({
      connectionString: readDatabaseUrl(),
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
    });
    pool.on("error", () => console.error("database_pool_error"));
    database = drizzle(pool);
  }
  return database;
}

export async function closeDb() { await pool?.end(); pool = undefined; database = undefined; }
