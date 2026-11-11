import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { readAppUrl } from "@/lib/config";
import { invariant } from "@/lib/errors";

let auth: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  const secret = process.env.AUTH_SECRET;
  invariant(secret && secret.length >= 32 && !secret.startsWith("REPLACE_"), "CONFIGURATION", "AUTH_SECRET wajib diisi dengan nilai acak.", 503);
  return betterAuth({
    appName: "War KRS", baseURL: readAppUrl(), secret,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    trustedOrigins: [readAppUrl()],
    emailAndPassword: { enabled: true, disableSignUp: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: { additionalFields: { role: { type: "string", defaultValue: "STUDENT", input: false } } },
    session: { expiresIn: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100, customRules: { "/sign-in/email": { window: 60, max: 15 } } },
    advanced: { database: { generateId: () => crypto.randomUUID() } },
    logger: { disabled: true },
  });
}
export function getAuth() { return auth ??= createAuth(); }
