CREATE TABLE public.drive_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_drive' CHECK (provider = 'google_drive'),
  label TEXT NOT NULL,
  google_account_email TEXT,
  root_folder_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'error')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id, org_id),
  UNIQUE (org_id, provider, label)
);

CREATE INDEX idx_drive_connections_org_status
  ON public.drive_connections(org_id, status);

ALTER TABLE public.drive_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY drive_connections_select
  ON public.drive_connections
  FOR SELECT TO authenticated
  USING (public.org_is_active_member(org_id));

CREATE POLICY drive_connections_insert
  ON public.drive_connections
  FOR INSERT TO authenticated
  WITH CHECK (public.org_is_admin(org_id));

CREATE POLICY drive_connections_update
  ON public.drive_connections
  FOR UPDATE TO authenticated
  USING (public.org_is_admin(org_id))
  WITH CHECK (public.org_is_admin(org_id));

CREATE POLICY drive_connections_delete
  ON public.drive_connections
  FOR DELETE TO authenticated
  USING (public.org_is_admin(org_id));

DROP TRIGGER IF EXISTS trg_drive_connections_updated ON public.drive_connections;
CREATE TRIGGER trg_drive_connections_updated
  BEFORE UPDATE ON public.drive_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.drive_connection_secrets (
  connection_id UUID PRIMARY KEY REFERENCES public.drive_connections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  refresh_token_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT drive_connection_secrets_connection_org_fkey
    FOREIGN KEY (connection_id, org_id)
    REFERENCES public.drive_connections(id, org_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_drive_connection_secrets_org_connection
  ON public.drive_connection_secrets(org_id, connection_id);

ALTER TABLE public.drive_connection_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY drive_connection_secrets_authenticated_deny
  ON public.drive_connection_secrets
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

DROP TRIGGER IF EXISTS trg_drive_connection_secrets_updated ON public.drive_connection_secrets;
CREATE TRIGGER trg_drive_connection_secrets_updated
  BEFORE UPDATE ON public.drive_connection_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.upsert_drive_connection(
  p_org_id UUID,
  p_provider TEXT,
  p_label TEXT,
  p_root_folder_id TEXT,
  p_created_by UUID,
  p_refresh_token_encrypted TEXT,
  p_connection_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_connection_id UUID;
BEGIN
  IF p_org_id IS NULL
    OR p_provider IS NULL
    OR p_label IS NULL
    OR p_root_folder_id IS NULL
    OR p_refresh_token_encrypted IS NULL
    OR length(trim(p_refresh_token_encrypted)) = 0 THEN
    RAISE EXCEPTION 'Invalid Drive connection data';
  END IF;

  IF p_provider <> 'google_drive' THEN
    RAISE EXCEPTION 'Invalid Drive provider';
  END IF;

  IF p_connection_id IS NOT NULL THEN
    SELECT id
    INTO target_connection_id
    FROM public.drive_connections
    WHERE id = p_connection_id
      AND org_id = p_org_id
    FOR UPDATE;

    IF target_connection_id IS NULL THEN
      RAISE EXCEPTION 'Drive connection not found';
    END IF;

    UPDATE public.drive_connections
    SET provider = p_provider,
        label = p_label,
        root_folder_id = p_root_folder_id,
        status = 'active',
        created_by = p_created_by
    WHERE id = target_connection_id
      AND org_id = p_org_id;
  ELSE
    INSERT INTO public.drive_connections(
      org_id,
      provider,
      label,
      root_folder_id,
      status,
      created_by
    )
    VALUES (
      p_org_id,
      p_provider,
      p_label,
      p_root_folder_id,
      'active',
      p_created_by
    )
    ON CONFLICT (org_id, provider, label)
    DO UPDATE SET
      root_folder_id = EXCLUDED.root_folder_id,
      status = 'active',
      created_by = EXCLUDED.created_by
    RETURNING id INTO target_connection_id;
  END IF;

  INSERT INTO public.drive_connection_secrets(
    connection_id,
    org_id,
    refresh_token_encrypted
  )
  VALUES (
    target_connection_id,
    p_org_id,
    p_refresh_token_encrypted
  )
  ON CONFLICT (connection_id)
  DO UPDATE SET
    org_id = EXCLUDED.org_id,
    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
    updated_at = now();

  RETURN target_connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_drive_connection(
  p_org_id UUID,
  p_connection_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_connection_id UUID;
BEGIN
  SELECT id
  INTO target_connection_id
  FROM public.drive_connections
  WHERE id = p_connection_id
    AND org_id = p_org_id
  FOR UPDATE;

  IF target_connection_id IS NULL THEN
    RAISE EXCEPTION 'Drive connection not found';
  END IF;

  UPDATE public.drive_connections
  SET status = 'revoked'
  WHERE id = target_connection_id
    AND org_id = p_org_id;

  DELETE FROM public.drive_connection_secrets
  WHERE connection_id = target_connection_id
    AND org_id = p_org_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.revoke_drive_connection(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_drive_connection(UUID, UUID)
  TO service_role;
