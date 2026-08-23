-- 036_fix_org_invitations_rls.sql
-- Fix C1 (docs/audits/SECURITY_AUDIT.md): la policy org_inv_update con USING (true)
-- permitia a cualquier usuario autenticado reescribir invitaciones ajenas
-- (auto-invitarse como admin en organizaciones arbitrarias).
--
-- Nueva politica UPDATE:
--   - El invitado (email coincide con su perfil) puede marcar accepted/expired.
--   - Owner/admin de la organizacion pueden revocar.
--   - GRANT por columna: clientes autenticados solo pueden cambiar `status`;
--     role/org_id/token/email/expires_at quedan protegidos contra escritura.

DROP POLICY IF EXISTS "org_inv_update" ON org_invitations;

CREATE POLICY "org_inv_update" ON org_invitations
  FOR UPDATE
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
  );

REVOKE UPDATE ON TABLE org_invitations FROM authenticated;
GRANT UPDATE (status) ON TABLE org_invitations TO authenticated;
