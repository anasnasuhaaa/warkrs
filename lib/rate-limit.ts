import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { invariant } from "@/lib/errors";
export async function limit(key: string, max: number, seconds = 60) {
  const hashed = createHash("sha256").update(key).digest("hex");
  const result = await getDb().execute(sql`
    INSERT INTO request_limits (key, count, resets_at) VALUES (${hashed}, 1, clock_timestamp() + ${seconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN request_limits.resets_at <= clock_timestamp() THEN 1 ELSE request_limits.count + 1 END,
      resets_at = CASE WHEN request_limits.resets_at <= clock_timestamp() THEN clock_timestamp() + ${seconds} * interval '1 second' ELSE request_limits.resets_at END
    RETURNING count`);
  invariant(
    Number(result.rows[0].count) <= max,
    "RATE_LIMITED",
    "Terlalu banyak percobaan. Tunggu satu menit.",
    429,
  );
}
