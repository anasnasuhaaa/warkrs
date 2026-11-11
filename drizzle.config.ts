import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { readDatabaseUrl } from "./lib/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: readDatabaseUrl(true) },
  strict: true,
});
