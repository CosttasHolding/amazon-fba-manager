CREATE TABLE public.drive_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  root_folder_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drive_oauth_states_org_user_fkey
    FOREIGN KEY (org_id, user_id)
    REFERENCES public.org_members(org_id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_drive_oauth_states_org_expires
  ON public.drive_oauth_states(org_id, expires_at);

ALTER TABLE public.drive_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY drive_oauth_states_authenticated_deny
  ON public.drive_oauth_states
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.drive_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.drive_oauth_states TO service_role;

CREATE OR REPLACE FUNCTION public.drive_connections_root_folder_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.root_folder_id IS DISTINCT FROM OLD.root_folder_id
    AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Drive root folder is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drive_connections_root_folder_immutable ON public.drive_connections;
CREATE TRIGGER drive_connections_root_folder_immutable
  BEFORE UPDATE ON public.drive_connections
  FOR EACH ROW EXECUTE FUNCTION public.drive_connections_root_folder_immutable();

DROP FUNCTION IF EXISTS public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.upsert_drive_connection(
  p_org_id UUID,
  p_provider TEXT,
  p_label TEXT,
  p_root_folder_id TEXT,
  p_created_by UUID,
  p_actor_id UUID,
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
  IF NOT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = p_actor_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Drive connection authorization failed';
  END IF;

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

DROP FUNCTION IF EXISTS public.revoke_drive_connection(UUID, UUID);
CREATE OR REPLACE FUNCTION public.revoke_drive_connection(
  p_org_id UUID,
  p_connection_id UUID,
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_connection_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = p_actor_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Drive connection authorization failed';
  END IF;

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

CREATE OR REPLACE FUNCTION public.consume_drive_oauth_state(p_state_hash TEXT)
RETURNS TABLE(user_id UUID, org_id UUID, root_folder_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM public.drive_oauth_states
  WHERE state_hash = p_state_hash
    AND expires_at > now()
  RETURNING drive_oauth_states.user_id,
            drive_oauth_states.org_id,
            drive_oauth_states.root_folder_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_drive_connection(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.revoke_drive_connection(UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_drive_connection(UUID, UUID, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.consume_drive_oauth_state(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_drive_oauth_state(TEXT)
  TO service_role;
