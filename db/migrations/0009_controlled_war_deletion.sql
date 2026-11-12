-- Only this SECURITY DEFINER operation may create a deletion permit. Caller-set
-- GUCs cannot authorize deletion. The permit is bound to one game/transaction/backend
-- and removed before returning; rollback removes it and the tombstone atomically.
CREATE SCHEMA war_admin_private;
REVOKE ALL ON SCHEMA war_admin_private FROM PUBLIC;
--> statement-breakpoint
CREATE TABLE war_admin_private.deletion_permits (
  transaction_id bigint NOT NULL,
  backend_pid integer NOT NULL,
  game_id text NOT NULL,
  PRIMARY KEY(transaction_id, backend_pid, game_id)
);
REVOKE ALL ON war_admin_private.deletion_permits FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION public.war_deletion_allowed(target_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM war_admin_private.deletion_permits
    WHERE transaction_id=txid_current() AND backend_pid=pg_backend_pid() AND game_id=target_id)
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.protect_game_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND public.war_deletion_allowed(OLD.id) THEN RETURN OLD; END IF;
  IF OLD.published_at IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published game cannot be deleted'; END IF;
    IF ROW(NEW.id,NEW.title,NEW.terms_text,NEW.terms_version,NEW.starts_at,NEW.ends_at,NEW.published_at,NEW.created_by,NEW.created_at)
      IS DISTINCT FROM ROW(OLD.id,OLD.title,OLD.terms_text,OLD.terms_version,OLD.starts_at,OLD.ends_at,OLD.published_at,OLD.created_by,OLD.created_at)
      THEN RAISE EXCEPTION 'Published configuration is frozen'; END IF;
    IF OLD.completed_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN
      -- A visibility-only toggle is the sole completed-row update exception.
      IF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden AND
        (to_jsonb(NEW)-ARRAY['is_hidden','updated_at']) = (to_jsonb(OLD)-ARRAY['is_hidden','updated_at']) THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Completed game is immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.protect_game_children() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent public.games; target_id text;
BEGIN
  IF TG_OP='DELETE' AND public.war_deletion_allowed(OLD.game_id) THEN RETURN OLD; END IF;
  IF TG_OP='DELETE' THEN target_id=OLD.game_id; ELSE target_id=NEW.game_id; END IF;
  SELECT * INTO parent FROM public.games WHERE id=target_id FOR UPDATE;
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
CREATE OR REPLACE FUNCTION public.reject_history_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND public.war_deletion_allowed(OLD.game_id) THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'History is append-only';
END $$;
--> statement-breakpoint
CREATE FUNCTION public.delete_war_permanently(
  target_id text, actor_id text, confirmation text, deletion_reason text, simulation_confirmed boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE war public.games; checked_at timestamptz; counts jsonb;
BEGIN
  -- Endpoint verifies the session; recheck the referenced active admin here too.
  PERFORM id FROM public.users WHERE id=actor_id AND role='ADMIN' AND email_verified FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WAR_DELETE_FORBIDDEN'; END IF;
  SELECT * INTO war FROM public.games WHERE id=target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WAR_DELETE_NOT_FOUND'; END IF;
  checked_at := clock_timestamp();
  IF confirmation IS DISTINCT FROM war.title OR simulation_confirmed IS DISTINCT FROM true
    OR deletion_reason IS NULL OR length(btrim(deletion_reason)) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'WAR_DELETE_CONFIRMATION';
  END IF;
  IF war.completed_at IS NOT NULL THEN
    IF war.published_at IS NULL OR war.closed_at IS NULL OR war.closed_at>checked_at
      OR war.completed_at<war.closed_at OR war.completed_at>checked_at
      OR EXISTS (SELECT 1 FROM public.war_submissions s WHERE s.game_id=target_id AND
        ((SELECT count(*) FROM public.war_allocations a WHERE a.submission_id=s.id)<>1 OR
         (SELECT count(*) FROM public.war_preferences p WHERE p.submission_id=s.id)<>
         (SELECT count(*) FROM public.game_packages p WHERE p.game_id=target_id))) THEN
      RAISE EXCEPTION 'WAR_DELETE_UNSAFE';
    END IF;
  ELSIF war.closed_at IS NOT NULL OR (war.published_at IS NOT NULL AND checked_at>=war.starts_at)
    OR war.next_submission_sequence<>0 OR EXISTS(SELECT 1 FROM public.war_submissions WHERE game_id=target_id) THEN
    -- An expired but unreconciled War is Closing, never implicitly Completed here.
    RAISE EXCEPTION 'WAR_DELETE_UNSAFE';
  END IF;
  SELECT jsonb_build_object(
    'allocations',(SELECT count(*) FROM public.war_allocations WHERE game_id=target_id),
    'preferences',(SELECT count(*) FROM public.war_preferences WHERE game_id=target_id),
    'events',(SELECT count(*) FROM public.war_events WHERE game_id=target_id),
    'submissions',(SELECT count(*) FROM public.war_submissions WHERE game_id=target_id),
    'participants',(SELECT count(*) FROM public.game_participants WHERE game_id=target_id),
    'packages',(SELECT count(*) FROM public.game_packages WHERE game_id=target_id),
    'audits',(SELECT count(*) FROM public.admin_audit_logs WHERE game_id=target_id)
  ) INTO counts;
  INSERT INTO war_admin_private.deletion_permits VALUES(txid_current(),pg_backend_pid(),target_id);
  -- FK dependency order; all predicates are scoped to this War, never its users.
  DELETE FROM public.war_events WHERE game_id=target_id;
  DELETE FROM public.war_allocations WHERE game_id=target_id;
  DELETE FROM public.war_preferences WHERE game_id=target_id;
  DELETE FROM public.war_submissions WHERE game_id=target_id;
  DELETE FROM public.game_participants WHERE game_id=target_id;
  DELETE FROM public.game_packages WHERE game_id=target_id;
  DELETE FROM public.admin_audit_logs WHERE game_id=target_id;
  DELETE FROM public.games WHERE id=target_id;
  INSERT INTO public.admin_audit_logs(id,admin_user_id,game_id,action,reason,metadata,created_at)
    VALUES(gen_random_uuid()::text,actor_id,NULL,'GAME_PERMANENTLY_DELETED',btrim(deletion_reason),
      jsonb_build_object('deletedGameId',target_id,'title',war.title,'adminId',actor_id,
        'simulationConfirmed',true,'counts',counts,'deletedAt',checked_at)::text,checked_at);
  DELETE FROM war_admin_private.deletion_permits WHERE transaction_id=txid_current() AND backend_pid=pg_backend_pid() AND game_id=target_id;
  RETURN counts;
END $$;
--> statement-breakpoint
-- Owner can execute. A distinct application role needs an explicit narrow GRANT;
-- never grant it access to the private permit table/schema (see README).
REVOKE ALL ON FUNCTION public.delete_war_permanently(text,text,text,text,boolean) FROM PUBLIC;
