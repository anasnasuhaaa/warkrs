import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Client } from "pg";
import { z } from "zod";
import { readDatabaseUrl } from "../lib/config";
loadEnvConfig(process.cwd());
async function main() {
  const name = z.string().trim().min(1).max(150).parse(process.env.BOOTSTRAP_NAME);
  const email = z.email().parse(process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase());
  const password = z.string().min(16).max(128).parse(process.env.BOOTSTRAP_PASSWORD);
  const hash = await hashPassword(password); const id = randomUUID();
  const client = new Client({ connectionString: readDatabaseUrl(true) });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(410201)");
    const existing = await client.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (existing.rowCount) throw new Error("ADMIN_EXISTS");
    await client.query("INSERT INTO users(id,full_name,email_normalized,email_verified,role) VALUES($1,$2,$3,true,'ADMIN')", [id,name,email]);
    await client.query("INSERT INTO accounts(id,user_id,account_id,provider_id,password_hash) VALUES($1,$2,$2,'credential',$3)",[randomUUID(),id,hash]);
    await client.query("COMMIT"); console.log("Administrator created. Clear bootstrap environment variables now.");
  } catch { await client.query("ROLLBACK"); throw new Error("BOOTSTRAP_FAILED"); }
  finally { await client.end(); }
}
void main().catch(() => { console.error("Bootstrap failed. Check input, migration and existing admin. No account was overwritten."); process.exitCode = 1; });
