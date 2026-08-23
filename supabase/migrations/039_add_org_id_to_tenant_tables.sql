-- ============================================================
-- 039_add_org_id_to_tenant_tables.sql
-- Agrega org_id a tablas tenant-scoped que el código escribe/filtra
-- por org_id pero que no tienen la columna (mismo mismatch que 037).
--
-- Hallazgo FASE 11 (batería QA en vivo): POST /api/inventory/movements
-- fallaba con 400; auditoría sistemática reveló las demás.
--
-- Columnas NULLABLE (sin backfill destructivo): el scoping histórico
-- queda a criterio del owner; las filas viejas son de la era
-- single-tenant del owner original.
-- ============================================================

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.ppc_campaigns
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.ppc_daily_metrics
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.amazon_payouts
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.saved_calculations
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.supplier_quotes
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.product_suppliers
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON public.stock_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON public.inventory(org_id);
CREATE INDEX IF NOT EXISTS idx_ppc_campaigns_org ON public.ppc_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_amazon_payouts_org ON public.amazon_payouts(org_id);
CREATE INDEX IF NOT EXISTS idx_saved_calculations_org ON public.saved_calculations(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_org ON public.supplier_quotes(org_id);
