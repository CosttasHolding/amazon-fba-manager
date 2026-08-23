CREATE TABLE public.amazon_settlement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.sp_api_connections(id) ON DELETE SET NULL,
  report_id TEXT,
  settlement_id TEXT NOT NULL,
  line_hash TEXT NOT NULL,
  marketplace TEXT,
  transaction_type TEXT,
  fee_type TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  posted_at DATE,
  order_id TEXT,
  sku TEXT,
  asin TEXT,
  product_id UUID,
  raw_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT amazon_settlement_lines_org_settlement_hash_key
    UNIQUE (org_id, settlement_id, line_hash)
);

CREATE INDEX idx_amazon_settlement_lines_org_posted_at
  ON public.amazon_settlement_lines (org_id, posted_at);

CREATE INDEX idx_amazon_settlement_lines_org_fee_type
  ON public.amazon_settlement_lines (org_id, fee_type);

CREATE INDEX idx_amazon_settlement_lines_org_settlement
  ON public.amazon_settlement_lines (org_id, settlement_id);

CREATE OR REPLACE FUNCTION public.validate_amazon_settlement_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE org_id = NEW.org_id
      AND user_id = NEW.user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Settlement line user is not an active member of the organization';
  END IF;

  IF NEW.connection_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.sp_api_connections
    WHERE id = NEW.connection_id
      AND org_id = NEW.org_id
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Settlement line connection does not belong to the organization and user';
  END IF;

  IF NEW.product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = NEW.product_id
      AND org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'Settlement line product does not belong to the organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_amazon_settlement_line
  BEFORE INSERT ON public.amazon_settlement_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_amazon_settlement_line();

ALTER TABLE public.amazon_settlement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY amazon_settlement_lines_select
  ON public.amazon_settlement_lines FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY amazon_settlement_lines_insert
  ON public.amazon_settlement_lines FOR INSERT
  WITH CHECK (is_org_member(org_id) AND user_id = auth.uid());
