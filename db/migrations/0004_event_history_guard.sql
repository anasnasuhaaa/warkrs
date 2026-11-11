CREATE TRIGGER events_append_only BEFORE UPDATE OR DELETE ON war_events FOR EACH ROW EXECUTE FUNCTION reject_history_change();
