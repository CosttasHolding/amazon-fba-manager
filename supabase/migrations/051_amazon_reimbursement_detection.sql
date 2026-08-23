CREATE TABLE IF NOT EXISTS public.amazon_reimbursement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.sp_api_connections(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  report_id TEXT NOT NULL,
  source_key TEXT NOT NULL,
  reimbursement_id TEXT,
  case_id TEXT,
  amazon_order_id TEXT,
  original_reimbursement_id TEXT,
  original_reimbursement_type TEXT,
  sku TEXT,
  fnsku TEXT,
  asin TEXT,
  reason TEXT,
  approval_date DATE,
  amount_per_unit NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (amount_per_unit >= 0),
  amount_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_total >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) BETWEEN 3 AND 3),
  quantity_reimbursed_cash INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reimbursed_cash >= 0),
  quantity_reimbursed_inventory INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reimbursed_inventory >= 0),
  quantity_reimbursed_total INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reimbursed_total >= 0),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_match_status TEXT NOT NULL CHECK (product_match_status IN ('matched_sku', 'matched_asin', 'unmatched', 'ambiguous', 'conflict')),
  movement_match_status TEXT NOT NULL CHECK (movement_match_status IN ('not_evaluated', 'not_comparable', 'none', 'candidate', 'ambiguous')),
  reconciliation_status TEXT NOT NULL DEFAULT 'unrecorded_amazon_reimbursement'
    CHECK (reconciliation_status IN ('unrecorded_amazon_reimbursement', 'possible_duplicate_loss', 'possible_existing_claim', 'linked', 'dismissed')),
  linked_reimbursement_id UUID REFERENCES public.reimbursements(id) ON DELETE SET NULL,
  raw_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, source_key)
);

CREATE TABLE IF NOT EXISTS public.amazon_reimbursement_movement_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amazon_reimbursement_event_id UUID NOT NULL REFERENCES public.amazon_reimbursement_events(id) ON DELETE CASCADE,
  stock_movement_id UUID NOT NULL REFERENCES public.stock_movements(id) ON DELETE CASCADE,
  match_reason TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('candidate', 'ambiguous')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, amazon_reimbursement_event_id, stock_movement_id)
);

CREATE INDEX IF NOT EXISTS idx_amazon_reimbursement_events_org_status
  ON public.amazon_reimbursement_events(org_id, reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_amazon_reimbursement_events_org_product
  ON public.amazon_reimbursement_events(org_id, product_id);
CREATE INDEX IF NOT EXISTS idx_amazon_reimbursement_events_org_approval
  ON public.amazon_reimbursement_events(org_id, approval_date DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_reimbursement_events_org_source
  ON public.amazon_reimbursement_events(org_id, source_key);
CREATE INDEX IF NOT EXISTS idx_amazon_reimbursement_matches_org_event
  ON public.amazon_reimbursement_movement_matches(org_id, amazon_reimbursement_event_id);

CREATE OR REPLACE FUNCTION public.validate_amazon_reimbursement_event_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  connection_org_id UUID;
  connection_user_id UUID;
  related_org_id UUID;
BEGIN
  SELECT org_id, user_id
    INTO connection_org_id, connection_user_id
    FROM public.sp_api_connections
   WHERE id = NEW.connection_id;

  IF connection_org_id IS DISTINCT FROM NEW.org_id
     OR connection_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Amazon reimbursement connection does not belong to event tenant';
  END IF;

  IF NEW.product_id IS NOT NULL THEN
    SELECT org_id INTO related_org_id FROM public.products WHERE id = NEW.product_id;
    IF related_org_id IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'Amazon reimbursement product does not belong to event tenant';
    END IF;
  END IF;

  IF NEW.linked_reimbursement_id IS NOT NULL THEN
    SELECT org_id INTO related_org_id FROM public.reimbursements WHERE id = NEW.linked_reimbursement_id;
    IF related_org_id IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'Linked reimbursement does not belong to event tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_amazon_reimbursement_event_tenant
  ON public.amazon_reimbursement_events;
CREATE TRIGGER trg_validate_amazon_reimbursement_event_tenant
  BEFORE INSERT OR UPDATE ON public.amazon_reimbursement_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_amazon_reimbursement_event_tenant();

CREATE OR REPLACE FUNCTION public.validate_amazon_reimbursement_movement_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  event_org_id UUID;
  event_product_id UUID;
  movement_org_id UUID;
  movement_product_id UUID;
BEGIN
  SELECT org_id, product_id
    INTO event_org_id, event_product_id
    FROM public.amazon_reimbursement_events
   WHERE id = NEW.amazon_reimbursement_event_id;

  SELECT org_id, product_id
    INTO movement_org_id, movement_product_id
    FROM public.stock_movements
   WHERE id = NEW.stock_movement_id;

  IF event_org_id IS DISTINCT FROM NEW.org_id
     OR movement_org_id IS DISTINCT FROM NEW.org_id
     OR (event_product_id IS NOT NULL AND movement_product_id IS DISTINCT FROM event_product_id) THEN
    RAISE EXCEPTION 'Amazon reimbursement movement match crosses tenant or product boundary';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_amazon_reimbursement_movement_tenant
  ON public.amazon_reimbursement_movement_matches;
CREATE TRIGGER trg_validate_amazon_reimbursement_movement_tenant
  BEFORE INSERT OR UPDATE ON public.amazon_reimbursement_movement_matches
  FOR EACH ROW EXECUTE FUNCTION public.validate_amazon_reimbursement_movement_tenant();

DROP TRIGGER IF EXISTS trg_amazon_reimbursement_events_updated ON public.amazon_reimbursement_events;
CREATE TRIGGER trg_amazon_reimbursement_events_updated
  BEFORE UPDATE ON public.amazon_reimbursement_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.protect_amazon_reimbursement_event_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND (
    NEW.org_id IS DISTINCT FROM OLD.org_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.connection_id IS DISTINCT FROM OLD.connection_id
    OR NEW.marketplace IS DISTINCT FROM OLD.marketplace
    OR NEW.report_id IS DISTINCT FROM OLD.report_id
    OR NEW.source_key IS DISTINCT FROM OLD.source_key
    OR NEW.reimbursement_id IS DISTINCT FROM OLD.reimbursement_id
    OR NEW.case_id IS DISTINCT FROM OLD.case_id
    OR NEW.amazon_order_id IS DISTINCT FROM OLD.amazon_order_id
    OR NEW.original_reimbursement_id IS DISTINCT FROM OLD.original_reimbursement_id
    OR NEW.original_reimbursement_type IS DISTINCT FROM OLD.original_reimbursement_type
    OR NEW.sku IS DISTINCT FROM OLD.sku
    OR NEW.fnsku IS DISTINCT FROM OLD.fnsku
    OR NEW.asin IS DISTINCT FROM OLD.asin
    OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.approval_date IS DISTINCT FROM OLD.approval_date
    OR NEW.amount_per_unit IS DISTINCT FROM OLD.amount_per_unit
    OR NEW.amount_total IS DISTINCT FROM OLD.amount_total
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.quantity_reimbursed_cash IS DISTINCT FROM OLD.quantity_reimbursed_cash
    OR NEW.quantity_reimbursed_inventory IS DISTINCT FROM OLD.quantity_reimbursed_inventory
    OR NEW.quantity_reimbursed_total IS DISTINCT FROM OLD.quantity_reimbursed_total
    OR NEW.raw_row IS DISTINCT FROM OLD.raw_row
    OR NEW.first_seen_at IS DISTINCT FROM OLD.first_seen_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Amazon reimbursement evidence is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_amazon_reimbursement_event_evidence
  ON public.amazon_reimbursement_events;
CREATE TRIGGER trg_protect_amazon_reimbursement_event_evidence
  BEFORE UPDATE ON public.amazon_reimbursement_events
  FOR EACH ROW EXECUTE FUNCTION public.protect_amazon_reimbursement_event_evidence();

ALTER TABLE public.amazon_reimbursement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_reimbursement_movement_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS amazon_reimbursement_events_select ON public.amazon_reimbursement_events;
CREATE POLICY amazon_reimbursement_events_select
  ON public.amazon_reimbursement_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS amazon_reimbursement_events_update ON public.amazon_reimbursement_events;
CREATE POLICY amazon_reimbursement_events_update
  ON public.amazon_reimbursement_events
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'));

DROP POLICY IF EXISTS amazon_reimbursement_events_insert ON public.amazon_reimbursement_events;
CREATE POLICY amazon_reimbursement_events_insert
  ON public.amazon_reimbursement_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'));

DROP POLICY IF EXISTS amazon_reimbursement_movement_matches_select
  ON public.amazon_reimbursement_movement_matches;
CREATE POLICY amazon_reimbursement_movement_matches_select
  ON public.amazon_reimbursement_movement_matches
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE OR REPLACE FUNCTION public.replace_amazon_reimbursement_movement_matches(
  p_org_id UUID,
  p_event_ids UUID[],
  p_matches JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role'
     AND (NOT public.is_org_member(p_org_id) OR public.get_org_role(p_org_id) NOT IN ('owner', 'admin', 'editor')) THEN
    RAISE EXCEPTION 'Insufficient organization permissions';
  END IF;

  DELETE FROM public.amazon_reimbursement_movement_matches
   WHERE org_id = p_org_id
     AND amazon_reimbursement_event_id = ANY(p_event_ids);

  INSERT INTO public.amazon_reimbursement_movement_matches (
    org_id,
    amazon_reimbursement_event_id,
    stock_movement_id,
    match_reason,
    confidence
  )
  SELECT
    p_org_id,
    (match_row->>'event_id')::UUID,
    (match_row->>'movement_id')::UUID,
    match_row->>'match_reason',
    match_row->>'confidence'
  FROM jsonb_array_elements(COALESCE(p_matches, '[]'::JSONB)) AS match_row;
END;
$function$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
  ) THEN
    CREATE OR REPLACE FUNCTION public.validate_stock_movement_tenant_product()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      product_org_id UUID;
    BEGIN
      SELECT org_id INTO product_org_id FROM public.products WHERE id = NEW.product_id;
      IF product_org_id IS DISTINCT FROM NEW.org_id THEN
        RAISE EXCEPTION 'Stock movement product does not belong to movement tenant';
      END IF;
      RETURN NEW;
    END;
    $function$;

    DROP TRIGGER IF EXISTS trg_validate_stock_movement_tenant_product ON public.stock_movements;
    CREATE TRIGGER trg_validate_stock_movement_tenant_product
      BEFORE INSERT OR UPDATE OF org_id, product_id ON public.stock_movements
      FOR EACH ROW EXECUTE FUNCTION public.validate_stock_movement_tenant_product();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sync_logs'
  ) THEN
    ALTER TABLE public.sync_logs DROP CONSTRAINT IF EXISTS sync_logs_sync_type_check;
    ALTER TABLE public.sync_logs
      ADD CONSTRAINT sync_logs_sync_type_check
      CHECK (sync_type IN ('products', 'orders', 'inventory', 'fees', 'returns', 'payouts', 'reimbursements'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reimbursements'
  ) THEN
    CREATE OR REPLACE FUNCTION public.validate_reimbursement_tenant_links()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      related_org_id UUID;
    BEGIN
      IF NEW.product_id IS NOT NULL THEN
        SELECT org_id INTO related_org_id FROM public.products WHERE id = NEW.product_id;
        IF related_org_id IS DISTINCT FROM NEW.org_id THEN
          RAISE EXCEPTION 'Reimbursement product does not belong to reimbursement tenant';
        END IF;
      END IF;

      IF NEW.return_id IS NOT NULL THEN
        SELECT org_id INTO related_org_id FROM public.returns WHERE id = NEW.return_id;
        IF related_org_id IS DISTINCT FROM NEW.org_id THEN
          RAISE EXCEPTION 'Reimbursement return does not belong to reimbursement tenant';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $function$;

    DROP TRIGGER IF EXISTS trg_validate_reimbursement_tenant_links ON public.reimbursements;
    CREATE TRIGGER trg_validate_reimbursement_tenant_links
      BEFORE INSERT OR UPDATE OF org_id, product_id, return_id ON public.reimbursements
      FOR EACH ROW EXECUTE FUNCTION public.validate_reimbursement_tenant_links();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reimbursements'
  ) THEN
    DROP POLICY IF EXISTS reimbursements_insert ON public.reimbursements;
    CREATE POLICY reimbursements_insert
      ON public.reimbursements
      FOR INSERT TO authenticated
      WITH CHECK (public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'));

    DROP POLICY IF EXISTS reimbursements_update ON public.reimbursements;
    CREATE POLICY reimbursements_update
      ON public.reimbursements
      FOR UPDATE TO authenticated
      USING (public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'))
      WITH CHECK (public.is_org_member(org_id) AND public.get_org_role(org_id) IN ('owner', 'admin', 'editor'));
  END IF;
END $$;
