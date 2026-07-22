-- Migracion 020: Fix notifications RLS - eliminar USING(true) que anula aislamiento por usuario
-- El policy "Service role full access" con USING(true) permite a CUALQUIER usuario leer/modificar
-- todas las notificaciones. El service_role de Supabase YA bypass RLS, no necesita este policy.

DROP POLICY IF EXISTS "Service role full access" ON notifications;

-- Recrear policy restringido solo a service_role (si se necesita explícitamente)
CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
