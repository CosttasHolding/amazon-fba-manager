ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_user_id_sku_key;
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_org_user_sku_key;
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_org_sku_key;

ALTER TABLE public.products
  ADD CONSTRAINT products_org_sku_key UNIQUE (org_id, sku);
