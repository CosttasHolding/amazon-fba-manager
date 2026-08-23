-- ============================================================
-- 038_fix_org_members_rls.sql
-- Corrige recursión infinita (42P17) en políticas RLS de
-- org_members y organizations detectada en producción.
--
-- Causa raíz (desde migración 024):
--   org_members_select       -> subconsulta sobre org_members (auto-referencia)
--   organizations.*          -> subconsultas sobre org_members (recursión cruzada)
--   Resultado: TODO SELECT autenticado sobre ambas tablas falla con
--   "infinite recursion detected in policy".
--
-- Fix canónico: funciones SECURITY DEFINER STABLE que evalúan membresía
-- bypassando RLS internamente (sin recursión), preservando semántica:
--   - miembro activo ve roster completo de sus organizaciones
--   - owner/admin gestionan miembros
--   - solo owner elimina la organización
-- ============================================================

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION public.org_is_active_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.org_is_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.org_is_owner(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION
  public.org_is_active_member(uuid),
  public.org_is_admin(uuid),
  public.org_is_owner(uuid)
TO authenticated;

-- ---------- org_members ----------
DROP POLICY IF EXISTS org_members_select ON org_members;
CREATE POLICY org_members_select ON org_members
  FOR SELECT
  USING (public.org_is_active_member(org_id));

DROP POLICY IF EXISTS org_members_insert ON org_members;
CREATE POLICY org_members_insert ON org_members
  FOR INSERT
  WITH CHECK (public.org_is_admin(org_id));

DROP POLICY IF EXISTS org_members_update ON org_members;
CREATE POLICY org_members_update ON org_members
  FOR UPDATE
  USING (public.org_is_admin(org_id));

DROP POLICY IF EXISTS org_members_delete ON org_members;
CREATE POLICY org_members_delete ON org_members
  FOR DELETE
  USING (public.org_is_admin(org_id));

-- ---------- organizations ----------
DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations
  FOR SELECT
  USING (public.org_is_active_member(id));

DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations
  FOR UPDATE
  USING (public.org_is_admin(id));

DROP POLICY IF EXISTS org_delete ON organizations;
CREATE POLICY org_delete ON organizations
  FOR DELETE
  USING (public.org_is_owner(id));
