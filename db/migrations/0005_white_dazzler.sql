CREATE TABLE "war_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"package_id" text NOT NULL,
	"awarded_rank" integer NOT NULL,
	"allocated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "war_allocations_submission_id_unique" UNIQUE("submission_id")
);

--> statement-breakpoint

CREATE TABLE "war_preferences" (
	"submission_id" text NOT NULL,
	"game_id" text NOT NULL,
	"rank" integer NOT NULL,
	"package_id" text NOT NULL,
	CONSTRAINT "war_preferences_submission_id_rank_pk" PRIMARY KEY("submission_id","rank"),
	CONSTRAINT "preference_rank_positive" CHECK ("war_preferences"."rank">0)
);

--> statement-breakpoint

CREATE TABLE "war_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_sequence_positive" CHECK ("war_submissions"."sequence" > 0)
);

--> statement-breakpoint

CREATE UNIQUE INDEX "allocation_game_user_unique" ON "war_allocations" USING btree ("game_id","user_id");
--> statement-breakpoint

CREATE INDEX "allocation_package_idx" ON "war_allocations" USING btree ("game_id","package_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "preference_package_unique" ON "war_preferences" USING btree ("submission_id","package_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "preference_rank_package_unique" ON "war_preferences" USING btree ("submission_id","rank","package_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "submission_game_user_unique" ON "war_submissions" USING btree ("game_id","user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "submission_game_sequence_unique" ON "war_submissions" USING btree ("game_id","sequence");
--> statement-breakpoint

CREATE UNIQUE INDEX "submission_game_id_unique" ON "war_submissions" USING btree ("game_id","id");
--> statement-breakpoint

CREATE UNIQUE INDEX "submission_game_id_user_unique" ON "war_submissions" USING btree ("game_id","id","user_id");
--> statement-breakpoint

ALTER TABLE "war_allocations" ADD CONSTRAINT "war_allocations_game_id_submission_id_user_id_war_submissions_game_id_id_user_id_fk" FOREIGN KEY ("game_id","submission_id","user_id") REFERENCES "public"."war_submissions"("game_id","id","user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "war_allocations" ADD CONSTRAINT "war_allocations_game_id_package_id_game_packages_game_id_id_fk" FOREIGN KEY ("game_id","package_id") REFERENCES "public"."game_packages"("game_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "war_allocations" ADD CONSTRAINT "war_allocations_submission_id_awarded_rank_package_id_war_preferences_submission_id_rank_package_id_fk" FOREIGN KEY ("submission_id","awarded_rank","package_id") REFERENCES "public"."war_preferences"("submission_id","rank","package_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "war_preferences" ADD CONSTRAINT "war_preferences_game_id_submission_id_war_submissions_game_id_id_fk" FOREIGN KEY ("game_id","submission_id") REFERENCES "public"."war_submissions"("game_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "war_preferences" ADD CONSTRAINT "war_preferences_game_id_package_id_game_packages_game_id_id_fk" FOREIGN KEY ("game_id","package_id") REFERENCES "public"."game_packages"("game_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "war_submissions" ADD CONSTRAINT "war_submissions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "war_submissions" ADD CONSTRAINT "war_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "war_submissions" ADD CONSTRAINT "war_submissions_game_id_user_id_game_participants_game_id_user_id_fk" FOREIGN KEY ("game_id","user_id") REFERENCES "public"."game_participants"("game_id","user_id") ON DELETE no action ON UPDATE no action;
