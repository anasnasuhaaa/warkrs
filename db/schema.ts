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

export const games = pgTable("games", {
  id: text("id").primaryKey(), title: text("title").notNull(), termsText: text("terms_text").notNull().default(""),
  termsVersion: text("terms_version").notNull(), startsAt: time("starts_at").notNull(), endsAt: time("ends_at").notNull(),
  publishedAt: time("published_at"), closedAt: time("closed_at"), closeReason: text("close_reason"), closedBy: text("closed_by").references(() => user.id), completedAt: time("completed_at"),
  nextSequence: integer("next_submission_sequence").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => user.id), createdAt: time("created_at").notNull().defaultNow(), updatedAt: time("updated_at").notNull().defaultNow(),
}, (t) => [check("game_dates", sql`${t.endsAt} > ${t.startsAt}`), check("sequence_nonnegative",sql`${t.nextSequence} >= 0`), index("games_lifecycle_idx").on(t.publishedAt,t.startsAt,t.endsAt)]);
export const packages = pgTable("game_packages", {
  id: text("id").primaryKey(), gameId: text("game_id").notNull().references(() => games.id), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(),
  capacity: integer("capacity").notNull(), allocatedCount: integer("allocated_count").default(0).notNull(), createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("package_name_unique").on(t.gameId,t.normalizedName), uniqueIndex("package_game_unique").on(t.gameId,t.id), check("package_capacity",sql`${t.capacity} > 0 AND ${t.allocatedCount} >= 0 AND ${t.allocatedCount} <= ${t.capacity}`)]);
export const participants = pgTable("game_participants", {
  gameId: text("game_id").notNull().references(() => games.id), userId: text("user_id").notNull().references(() => user.id),
  joinedAt: time("joined_at"), consentedAt: time("consented_at"), consentedTermsVersion: text("consented_terms_version"),
  whitelistedAt: time("whitelisted_at").notNull().defaultNow(), whitelistedBy: text("whitelisted_by").notNull().references(() => user.id),
}, (t) => [uniqueIndex("participant_unique").on(t.gameId,t.userId), index("participants_user_idx").on(t.userId), check("participant_consent",sql`(${t.joinedAt} IS NULL AND ${t.consentedAt} IS NULL AND ${t.consentedTermsVersion} IS NULL) OR (${t.joinedAt} IS NOT NULL AND ${t.consentedAt} IS NOT NULL AND ${t.consentedTermsVersion} IS NOT NULL)`)]);
export const auditLogs = pgTable("admin_audit_logs", {
  id: text("id").primaryKey(), adminId: text("admin_user_id").notNull().references(() => user.id), gameId: text("game_id").references(() => games.id),
  action: text("action").notNull(), reason: text("reason"), metadata: text("metadata").notNull().default("{}"), createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("audit_game_idx").on(t.gameId,t.createdAt)]);
