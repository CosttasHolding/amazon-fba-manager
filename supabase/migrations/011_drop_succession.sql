-- 011_drop_succession.sql
-- Elimina la tabla succession_events y todo lo relacionado

DROP TRIGGER IF EXISTS set_updated_at_succession_events ON succession_events;
DROP INDEX IF EXISTS idx_succession_events_user_id;
DROP TABLE IF EXISTS succession_events;
