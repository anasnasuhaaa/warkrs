import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { readDatabaseUrl } from "../lib/config";
import { databaseFailure } from "./database-diagnostics";

loadEnvConfig(process.cwd());
async function main() {
  let step: "configuration" | "connection" = "configuration";
  let client: Client | undefined;
  try {
    client = new Client({
      connectionString: readDatabaseUrl(process.argv.includes("--direct")),
      connectionTimeoutMillis: 5000,
    });
    step = "connection";
    await client.connect();
    await client.query("SELECT 1");
    console.log("PostgreSQL connection: OK");
  } catch (error) {
    console.error(databaseFailure(error, step));
    process.exitCode = 1;
  } finally {
    await client?.end().catch(() => {});
  }
}
void main().catch((error) => {
  console.error(databaseFailure(error, "configuration"));
  process.exitCode = 1;
});
