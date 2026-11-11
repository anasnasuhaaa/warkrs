CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_user_id" text NOT NULL,
	"game_id" text,
	"action" text NOT NULL,
	"reason" text,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"terms_text" text DEFAULT '' NOT NULL,
	"terms_version" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"closed_by" text,
	"completed_at" timestamp with time zone,
	"next_submission_sequence" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_dates" CHECK ("games"."ends_at" > "games"."starts_at"),
	CONSTRAINT "sequence_nonnegative" CHECK ("games"."next_submission_sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "game_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"capacity" integer NOT NULL,
	"allocated_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_capacity" CHECK ("game_packages"."capacity" > 0 AND "game_packages"."allocated_count" >= 0 AND "game_packages"."allocated_count" <= "game_packages"."capacity")
);
--> statement-breakpoint
CREATE TABLE "game_participants" (
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone,
	"consented_at" timestamp with time zone,
	"consented_terms_version" text,
	"whitelisted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"whitelisted_by" text NOT NULL,
	CONSTRAINT "participant_consent" CHECK (("game_participants"."joined_at" IS NULL AND "game_participants"."consented_at" IS NULL AND "game_participants"."consented_terms_version" IS NULL) OR ("game_participants"."joined_at" IS NOT NULL AND "game_participants"."consented_at" IS NOT NULL AND "game_participants"."consented_terms_version" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_packages" ADD CONSTRAINT "game_packages_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_whitelisted_by_users_id_fk" FOREIGN KEY ("whitelisted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_game_idx" ON "admin_audit_logs" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "games_lifecycle_idx" ON "games" USING btree ("published_at","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "package_name_unique" ON "game_packages" USING btree ("game_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "package_game_unique" ON "game_packages" USING btree ("game_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_unique" ON "game_participants" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "participants_user_idx" ON "game_participants" USING btree ("user_id");