-- Make first-organization provisioning idempotent under concurrent requests.

CREATE OR REPLACE FUNCTION public.ensure_default_org(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_org_id uuid;
  new_org_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  SELECT org_id INTO existing_org_id
  FROM public.org_members
  WHERE user_id = target_user_id
    AND status = 'active'
  ORDER BY joined_at ASC
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    RETURN existing_org_id;
  END IF;

  INSERT INTO public.organizations(name, slug, owner_id)
  VALUES ('Mi Organización', 'org-' || gen_random_uuid(), target_user_id)
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members(org_id, user_id, role, status)
  VALUES (new_org_id, target_user_id, 'owner', 'active');

  RETURN new_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_org(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_default_org(uuid) TO service_role;
