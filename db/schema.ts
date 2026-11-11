import { sql } from "drizzle-orm";
import { pgTable, text, boolean, timestamp, uniqueIndex, index, integer, bigint, check } from "drizzle-orm/pg-core";
const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("full_name").notNull(),
  email: text("email_normalized").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").default("STUDENT").notNull(),
  createdAt: time("created_at").defaultNow().notNull(),
  updatedAt: time("updated_at").defaultNow().notNull(),
}, (t) => [check("user_role", sql`${t.role} in ('ADMIN','STUDENT')`), check("email_normalized", sql`${t.email} = lower(trim(${t.email}))`)]);
export const session = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: time("expires_at").notNull(),
  createdAt: time("created_at").defaultNow().notNull(),
  updatedAt: time("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (t) => [index("sessions_user_idx").on(t.userId)]);
export const account = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  password: text("password_hash"),
  accessToken: text("access_token"), refreshToken: text("refresh_token"), idToken: text("id_token"),
  accessTokenExpiresAt: time("access_token_expires_at"), refreshTokenExpiresAt: time("refresh_token_expires_at"), scope: text("scope"),
  createdAt: time("created_at").defaultNow().notNull(), updatedAt: time("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("account_provider_unique").on(t.providerId, t.accountId), index("accounts_user_idx").on(t.userId)]);
export const verification = pgTable("verifications", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(),
  expiresAt: time("expires_at").notNull(), createdAt: time("created_at").defaultNow().notNull(), updatedAt: time("updated_at").defaultNow().notNull(),
});
export const rateLimit = pgTable("rate_limits", {
  id: text("id").primaryKey(), key: text("key").notNull().unique(), count: integer("count").notNull(), lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const accountTokens = pgTable("account_tokens", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => user.id),
  tokenHash: text("token_hash").notNull().unique(), purpose: text("purpose").notNull(),
  expiresAt: time("expires_at").notNull(), consumedAt: time("consumed_at"), createdAt: time("created_at").defaultNow().notNull(),
}, (t) => [index("account_tokens_user_idx").on(t.userId), check("token_purpose", sql`${t.purpose} in ('ACTIVATION','PASSWORD_RESET')`)]);
export const requestLimits = pgTable("request_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), resetsAt: time("resets_at").notNull(),
});
