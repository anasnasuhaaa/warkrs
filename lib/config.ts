import { z } from "zod";

const databaseUrl = z.string().url().refine((value) => /^postgres(ql)?:/.test(value));

export function readDatabaseUrl(direct = false) {
  const result = databaseUrl.safeParse(
    (direct && process.env.DIRECT_DATABASE_URL) || process.env.DATABASE_URL,
  );
  if (!result.success) throw new Error("Konfigurasi DATABASE_URL tidak valid.");
  return result.data;
}

export function readAppUrl() {
  const result = z.url().safeParse(process.env.APP_BASE_URL ?? "http://localhost:3000");
  if (!result.success || !/^https?:/.test(result.data)) {
    throw new Error("Konfigurasi APP_BASE_URL tidak valid.");
  }
  return new URL(result.data).origin;
}
