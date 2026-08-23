-- 037_add_org_id_to_webhook_tables.sql
-- Fix QA_LOG 2026-08-22: el schema real de prod NO tiene org_id en las tablas
-- de webhooks, pero todo el codigo (route.ts) lo selecciona e inserta.
-- Efecto: el select de suscripcion falla siempre (42703/PGRST204) y ninguna
-- notificacion SP-API se atribuiria a una organizacion.
-- Ambas tablas estan VACIAS en prod -> cambio aditivo, cero riesgo de datos.

ALTER TABLE sp_api_webhook_subscriptions
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE sp_api_webhook_logs
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
