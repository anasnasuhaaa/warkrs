import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readDatabaseUrl } from "../lib/config";
import { databaseFailure } from "./database-diagnostics";
loadEnvConfig(process.cwd());
async function main() {
  let step: "configuration" | "connection" | "migration" = "configuration";
  let client: Client | undefined;
  try {
    client = new Client({
      connectionString: readDatabaseUrl(true),
      connectionTimeoutMillis: 15000,
    });
    step = "connection";
    await client.connect();
    step = "migration";
    await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
    console.log("Versioned migrations applied successfully.");
  } catch (error) {
    console.error(databaseFailure(error, step));
    console.error("Migration failed. No schema push or reset was performed.");
    process.exitCode = 1;
  } finally {
    await client?.end().catch(() => {});
  }
}
void main().catch((error) => {
  console.error(databaseFailure(error, "configuration"));
  process.exitCode = 1;
});
