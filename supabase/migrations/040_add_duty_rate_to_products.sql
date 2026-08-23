-- 040_add_duty_rate_to_products.sql
-- Add import duty as a decimal fraction (0.25 = 25%).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS duty_rate NUMERIC DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_duty_rate_range'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_duty_rate_range
      CHECK (duty_rate IS NULL OR duty_rate BETWEEN 0 AND 1);
  END IF;
END $$;

-- PostgreSQL does not support replacing a generated column expression in place.
-- Preserve explicit ACLs before dropping views that depend on products.*.
CREATE TEMP TABLE _040_view_grants (
  view_name TEXT NOT NULL,
  grantee TEXT NOT NULL,
  privilege_type TEXT NOT NULL,
  is_grantable BOOLEAN NOT NULL
) ON COMMIT DROP;

INSERT INTO _040_view_grants (view_name, grantee, privilege_type, is_grantable)
SELECT
  c.relname,
  CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
  acl.privilege_type,
  acl.is_grantable
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname IN ('products_real_profit', 'products_with_inventory')
  AND c.relacl IS NOT NULL;

DROP VIEW IF EXISTS public.products_real_profit;
DROP VIEW IF EXISTS public.products_with_inventory;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS total_cost,
  DROP COLUMN IF EXISTS net_profit,
  DROP COLUMN IF EXISTS roi;

ALTER TABLE public.products
  ADD COLUMN total_cost NUMERIC(10,2)
    GENERATED ALWAYS AS (
      unit_cost + (unit_cost * COALESCE(duty_rate, 0)) + shipping_cost + prep_cost + taxes
    ) STORED,
  ADD COLUMN net_profit NUMERIC(10,2)
    GENERATED ALWAYS AS (
      sale_price
      - (unit_cost + (unit_cost * COALESCE(duty_rate, 0)) + shipping_cost + prep_cost + taxes)
      - (referral_fee + fba_fee + storage_fee_monthly + other_fees)
    ) STORED,
  ADD COLUMN roi NUMERIC(10,2)
    GENERATED ALWAYS AS (
      CASE
        WHEN (unit_cost + (unit_cost * COALESCE(duty_rate, 0)) + shipping_cost + prep_cost + taxes) > 0
        THEN ROUND(
          (
            (
              sale_price
              - (unit_cost + (unit_cost * COALESCE(duty_rate, 0)) + shipping_cost + prep_cost + taxes)
              - (referral_fee + fba_fee + storage_fee_monthly + other_fees)
            )
            / (unit_cost + (unit_cost * COALESCE(duty_rate, 0)) + shipping_cost + prep_cost + taxes)
          ) * 100,
          2
        )
        ELSE 0
      END
    ) STORED;

CREATE VIEW public.products_real_profit
  WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.sku,
  p.name,
  p.net_profit AS unit_profit_estimated,
  COALESCE(s.total_revenue, 0) AS total_revenue,
  COALESCE(s.total_units, 0) AS total_units_sold,
  COALESCE(r.total_returns, 0) AS total_returns,
  COALESCE(r.total_refund_amount, 0) AS total_refund_amount,
  COALESCE(e.total_expenses, 0) AS total_expenses,
  COALESCE(re.total_reimbursements, 0) AS total_reimbursements,
  (
    COALESCE(s.total_revenue, 0)
    - COALESCE(r.total_refund_amount, 0)
    - COALESCE(e.total_expenses, 0)
    + COALESCE(re.total_reimbursements, 0)
  ) AS real_net_profit
FROM public.products AS p
LEFT JOIN (
  SELECT product_id, user_id, SUM(revenue) AS total_revenue, SUM(units_sold) AS total_units
  FROM public.sales
  GROUP BY product_id, user_id
) AS s ON s.product_id = p.id AND s.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(quantity) AS total_returns, SUM(refund_amount) AS total_refund_amount
  FROM public.returns
  GROUP BY product_id, user_id
) AS r ON r.product_id = p.id AND r.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(amount) AS total_expenses
  FROM public.expenses
  WHERE product_id IS NOT NULL
  GROUP BY product_id, user_id
) AS e ON e.product_id = p.id AND e.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(amount) AS total_reimbursements
  FROM public.reimbursements
  WHERE status = 'paid'
  GROUP BY product_id, user_id
) AS re ON re.product_id = p.id AND re.user_id = p.user_id;

CREATE VIEW public.products_with_inventory
  WITH (security_invoker = true) AS
SELECT p.*,
  COALESCE(i.stock_available, 0) AS stock_available,
  COALESCE(i.stock_inbound, 0) AS stock_inbound,
  COALESCE(i.stock_reserved, 0) AS stock_reserved,
  COALESCE(i.stock_warehouse, 0) AS stock_warehouse,
  COALESCE(i.reorder_point, 10) AS reorder_point,
  COALESCE(i.max_stock, 500) AS max_stock,
  CASE
    WHEN COALESCE(i.stock_available, 0) = 0 THEN 'out_of_stock'
    WHEN COALESCE(i.stock_available, 0) <= COALESCE(i.reorder_point, 10) THEN 'low_stock'
    WHEN COALESCE(i.stock_available, 0) >= COALESCE(i.max_stock, 500) THEN 'overstock'
    ELSE 'normal'
  END AS stock_status,
  COALESCE(s.units_last_30d, 0) AS sales_velocity_30d,
  COALESCE(s.revenue_last_30d, 0) AS revenue_last_30d,
  CASE
    WHEN COALESCE(s.units_last_30d, 0) > 0
    THEN ROUND(COALESCE(i.stock_available, 0)::DECIMAL / (s.units_last_30d::DECIMAL / 30), 0)
    ELSE NULL
  END AS days_of_stock
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(units_sold) AS units_last_30d, SUM(revenue) AS revenue_last_30d
  FROM public.sales
  WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY product_id
) s ON s.product_id = p.id;

DO $$
DECLARE
  grant_row RECORD;
BEGIN
  FOR grant_row IN SELECT * FROM _040_view_grants LOOP
    EXECUTE format(
      'GRANT %s ON TABLE public.%I TO %s%s',
      grant_row.privilege_type,
      grant_row.view_name,
      CASE
        WHEN grant_row.grantee = 'PUBLIC' THEN 'PUBLIC'
        ELSE format('%I', grant_row.grantee)
      END,
      CASE WHEN grant_row.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END
    );
  END LOOP;
END $$;
