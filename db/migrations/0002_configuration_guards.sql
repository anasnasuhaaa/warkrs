CREATE FUNCTION protect_game_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published game cannot be deleted'; END IF;
    IF ROW(NEW.title,NEW.terms_text,NEW.terms_version,NEW.starts_at,NEW.ends_at,NEW.published_at,NEW.created_by,NEW.created_at)
      IS DISTINCT FROM ROW(OLD.title,OLD.terms_text,OLD.terms_version,OLD.starts_at,OLD.ends_at,OLD.published_at,OLD.created_by,OLD.created_at)
      THEN RAISE EXCEPTION 'Published configuration is frozen'; END IF;
    IF OLD.completed_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Completed game is immutable'; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER games_configuration_guard BEFORE UPDATE OR DELETE ON games FOR EACH ROW EXECUTE FUNCTION protect_game_configuration();
--> statement-breakpoint
CREATE FUNCTION protect_game_children() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent games; target_id text;
BEGIN
  IF TG_OP='DELETE' THEN target_id=OLD.game_id; ELSE target_id=NEW.game_id; END IF;
  SELECT * INTO parent FROM games WHERE id=target_id FOR UPDATE;
  IF TG_OP='UPDATE' AND NEW.game_id IS DISTINCT FROM OLD.game_id THEN RAISE EXCEPTION 'Cannot move game data'; END IF;
  IF parent.published_at IS NOT NULL THEN
    IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'Published membership and packages frozen'; END IF;
    IF parent.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Completed data is immutable'; END IF;
    IF TG_TABLE_NAME='game_packages' THEN
      IF ROW(NEW.id,NEW.game_id,NEW.name,NEW.normalized_name,NEW.capacity,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.game_id,OLD.name,OLD.normalized_name,OLD.capacity,OLD.created_at) THEN RAISE EXCEPTION 'Published package frozen'; END IF;
    ELSE
      IF ROW(NEW.game_id,NEW.user_id,NEW.whitelisted_at,NEW.whitelisted_by) IS DISTINCT FROM ROW(OLD.game_id,OLD.user_id,OLD.whitelisted_at,OLD.whitelisted_by) THEN RAISE EXCEPTION 'Published whitelist frozen'; END IF;
      IF OLD.joined_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Consent is immutable'; END IF;
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER packages_configuration_guard BEFORE INSERT OR UPDATE OR DELETE ON game_packages FOR EACH ROW EXECUTE FUNCTION protect_game_children();
--> statement-breakpoint
CREATE TRIGGER participants_configuration_guard BEFORE INSERT OR UPDATE OR DELETE ON game_participants FOR EACH ROW EXECUTE FUNCTION protect_game_children();
--> statement-breakpoint
CREATE FUNCTION reject_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'History is append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION reject_history_change();
