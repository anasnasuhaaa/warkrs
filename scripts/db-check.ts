import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { readDatabaseUrl } from "../lib/config";

loadEnvConfig(process.cwd());
async function main() {
  const client = new Client({
    connectionString: readDatabaseUrl(),
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    console.log("PostgreSQL connection: OK");
  } catch {
    console.error(
      "PostgreSQL connection failed; check configuration and connectivity.",
    );
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
void main().catch(() => {
  console.error("PostgreSQL configuration invalid; set DATABASE_URL first.");
  process.exitCode = 1;
});
