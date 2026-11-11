ALTER TABLE war_events ADD CONSTRAINT event_submission_game_fk FOREIGN KEY(game_id,submission_id) REFERENCES war_submissions(game_id,id);
--> statement-breakpoint
CREATE TRIGGER submissions_immutable BEFORE UPDATE OR DELETE ON war_submissions FOR EACH ROW EXECUTE FUNCTION reject_history_change();
--> statement-breakpoint
CREATE TRIGGER preferences_immutable BEFORE UPDATE OR DELETE ON war_preferences FOR EACH ROW EXECUTE FUNCTION reject_history_change();
--> statement-breakpoint
CREATE TRIGGER allocations_immutable BEFORE UPDATE OR DELETE ON war_allocations FOR EACH ROW EXECUTE FUNCTION reject_history_change();
--> statement-breakpoint
CREATE FUNCTION check_complete_submission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE package_total integer; preference_total integer; allocation_total integer; max_rank integer;
BEGIN
 SELECT count(*) INTO package_total FROM game_packages WHERE game_id=NEW.game_id;
 SELECT count(*),max(rank) INTO preference_total,max_rank FROM war_preferences WHERE submission_id=NEW.id;
 SELECT count(*) INTO allocation_total FROM war_allocations WHERE submission_id=NEW.id;
 IF preference_total<>package_total OR max_rank<>package_total OR allocation_total<>1 THEN RAISE EXCEPTION 'Incomplete committed submission'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER submission_complete AFTER INSERT ON war_submissions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_complete_submission();
--> statement-breakpoint
CREATE FUNCTION check_package_occupancy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual integer; recorded integer;
BEGIN
 SELECT count(*) INTO actual FROM war_allocations WHERE package_id=NEW.id;
 SELECT allocated_count INTO recorded FROM game_packages WHERE id=NEW.id;
 IF actual<>recorded THEN RAISE EXCEPTION 'Package occupancy differs from allocations'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER package_occupancy AFTER UPDATE ON game_packages DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_package_occupancy();
--> statement-breakpoint
CREATE FUNCTION check_allocation_occupancy() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual integer; recorded integer;
BEGIN
 SELECT count(*) INTO actual FROM war_allocations WHERE package_id=NEW.package_id;
 SELECT allocated_count INTO recorded FROM game_packages WHERE id=NEW.package_id;
 IF actual<>recorded THEN RAISE EXCEPTION 'Allocation occupancy differs from counter'; END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER allocation_occupancy AFTER INSERT ON war_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_allocation_occupancy();
