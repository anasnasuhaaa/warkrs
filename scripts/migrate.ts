import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readDatabaseUrl } from "../lib/config";
loadEnvConfig(process.cwd());
async function main() {
  const client = new Client({
    connectionString: readDatabaseUrl(true),
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
    console.log("Versioned migrations applied successfully.");
  } finally {
    await client.end();
  }
}
void main().catch(() => {
  console.error(
    "Migration failed. Review connectivity and versioned SQL; no schema push or reset was performed.",
  );
  process.exitCode = 1;
});
