CREATE TABLE "war_events" (
	"event_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "war_events_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"game_id" text NOT NULL,
	"actor_user_id" text,
	"event_type" text NOT NULL,
	"package_id" text,
	"submission_id" text,
	"sequence" integer,
	"rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "war_events" ADD CONSTRAINT "war_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_events" ADD CONSTRAINT "war_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_events" ADD CONSTRAINT "war_events_package_id_game_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."game_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_game_cursor_idx" ON "war_events" USING btree ("game_id","event_id");