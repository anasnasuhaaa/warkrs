import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  integer,
  bigint,
  check,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";
const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const user = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("full_name").notNull(),
    nim: text("nim"),
    email: text("email_normalized").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: text("role").default("STUDENT").notNull(),
    createdAt: time("created_at").defaultNow().notNull(),
    updatedAt: time("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check("user_role", sql`${t.role} in ('ADMIN','STUDENT')`),
    check("email_normalized", sql`${t.email} = lower(trim(${t.email}))`),
    uniqueIndex("users_student_nim_unique")
      .on(t.nim)
      .where(sql`${t.role} = 'STUDENT'`),
    check(
      "student_nim_format",
      sql`${t.nim} IS NULL OR (${t.nim} = upper(trim(${t.nim})) AND length(${t.nim}) BETWEEN 1 AND 50 AND ${t.nim} ~ '^[A-Z0-9]+([.-][A-Z0-9]+)*$')`,
    ),
  ],
);
export const session = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").defaultNow().notNull(),
    updatedAt: time("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
export const account = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    password: text("password_hash"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: time("access_token_expires_at"),
    refreshTokenExpiresAt: time("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: time("created_at").defaultNow().notNull(),
    updatedAt: time("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("account_provider_unique").on(t.providerId, t.accountId),
    index("accounts_user_idx").on(t.userId),
  ],
);
export const verification = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: time("expires_at").notNull(),
  createdAt: time("created_at").defaultNow().notNull(),
  updatedAt: time("updated_at").defaultNow().notNull(),
});
export const rateLimit = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const accountTokens = pgTable(
  "account_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: text("purpose").notNull(),
    expiresAt: time("expires_at").notNull(),
    consumedAt: time("consumed_at"),
    createdAt: time("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("account_tokens_user_idx").on(t.userId),
    check(
      "token_purpose",
      sql`${t.purpose} in ('ACTIVATION','PASSWORD_RESET')`,
    ),
  ],
);
export const requestLimits = pgTable("request_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetsAt: time("resets_at").notNull(),
});

export const games = pgTable(
  "games",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
    termsText: text("terms_text").notNull().default(""),
    termsVersion: text("terms_version").notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    publishedAt: time("published_at"),
    closedAt: time("closed_at"),
    closeReason: text("close_reason"),
    closedBy: text("closed_by").references(() => user.id),
    completedAt: time("completed_at"),
    nextSequence: integer("next_submission_sequence").notNull().default(0),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("game_dates", sql`${t.endsAt} > ${t.startsAt}`),
    check("sequence_nonnegative", sql`${t.nextSequence} >= 0`),
    index("games_lifecycle_idx").on(t.publishedAt, t.startsAt, t.endsAt),
  ],
);
export const packages = pgTable(
  "game_packages",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    capacity: integer("capacity").notNull(),
    allocatedCount: integer("allocated_count").default(0).notNull(),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("package_name_unique").on(t.gameId, t.normalizedName),
    uniqueIndex("package_game_unique").on(t.gameId, t.id),
    check(
      "package_capacity",
      sql`${t.capacity} > 0 AND ${t.allocatedCount} >= 0 AND ${t.allocatedCount} <= ${t.capacity}`,
    ),
  ],
);
export const participants = pgTable(
  "game_participants",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    joinedAt: time("joined_at"),
    consentedAt: time("consented_at"),
    consentedTermsVersion: text("consented_terms_version"),
    whitelistedAt: time("whitelisted_at").notNull().defaultNow(),
    whitelistedBy: text("whitelisted_by")
      .notNull()
      .references(() => user.id),
  },
  (t) => [
    uniqueIndex("participant_unique").on(t.gameId, t.userId),
    index("participants_user_idx").on(t.userId),
    check(
      "participant_consent",
      sql`(${t.joinedAt} IS NULL AND ${t.consentedAt} IS NULL AND ${t.consentedTermsVersion} IS NULL) OR (${t.joinedAt} IS NOT NULL AND ${t.consentedAt} IS NOT NULL AND ${t.consentedTermsVersion} IS NOT NULL)`,
    ),
  ],
);
export const auditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_user_id")
      .notNull()
      .references(() => user.id),
    gameId: text("game_id").references(() => games.id),
    action: text("action").notNull(),
    reason: text("reason"),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_game_idx").on(t.gameId, t.createdAt)],
);
export const events = pgTable(
  "war_events",
  {
    eventId: bigint("event_id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    actorId: text("actor_user_id").references(() => user.id),
    type: text("event_type").notNull(),
    packageId: text("package_id").references(() => packages.id),
    submissionId: text("submission_id"),
    sequence: integer("sequence"),
    rank: integer("rank"),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("events_game_cursor_idx").on(t.gameId, t.eventId)],
);

export const submissions = pgTable(
  "war_submissions",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    sequence: integer("sequence").notNull(),
    acceptedAt: time("accepted_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("submission_game_user_unique").on(t.gameId, t.userId),
    uniqueIndex("submission_game_sequence_unique").on(t.gameId, t.sequence),
    uniqueIndex("submission_game_id_unique").on(t.gameId, t.id),
    uniqueIndex("submission_game_id_user_unique").on(t.gameId, t.id, t.userId),
    check("submission_sequence_positive", sql`${t.sequence} > 0`),
    foreignKey({
      columns: [t.gameId, t.userId],
      foreignColumns: [participants.gameId, participants.userId],
    }),
  ],
);
export const preferences = pgTable(
  "war_preferences",
  {
    submissionId: text("submission_id").notNull(),
    gameId: text("game_id").notNull(),
    rank: integer("rank").notNull(),
    packageId: text("package_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.submissionId, t.rank] }),
    uniqueIndex("preference_package_unique").on(t.submissionId, t.packageId),
    uniqueIndex("preference_rank_package_unique").on(
      t.submissionId,
      t.rank,
      t.packageId,
    ),
    check("preference_rank_positive", sql`${t.rank}>0`),
    foreignKey({
      columns: [t.gameId, t.submissionId],
      foreignColumns: [submissions.gameId, submissions.id],
    }),
    foreignKey({
      columns: [t.gameId, t.packageId],
      foreignColumns: [packages.gameId, packages.id],
    }),
  ],
);
export const allocations = pgTable(
  "war_allocations",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id").notNull().unique(),
    gameId: text("game_id").notNull(),
    userId: text("user_id").notNull(),
    packageId: text("package_id").notNull(),
    awardedRank: integer("awarded_rank").notNull(),
    allocatedAt: time("allocated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("allocation_game_user_unique").on(t.gameId, t.userId),
    index("allocation_package_idx").on(t.gameId, t.packageId),
    foreignKey({
      columns: [t.gameId, t.submissionId, t.userId],
      foreignColumns: [submissions.gameId, submissions.id, submissions.userId],
    }),
    foreignKey({
      columns: [t.gameId, t.packageId],
      foreignColumns: [packages.gameId, packages.id],
    }),
    foreignKey({
      columns: [t.submissionId, t.awardedRank, t.packageId],
      foreignColumns: [
        preferences.submissionId,
        preferences.rank,
        preferences.packageId,
      ],
    }),
  ],
);
