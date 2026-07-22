-- ============================================================
-- FIX: Recrear vista products_with_inventory con org_id
-- La vista fue creada en 021 ANES de que 024 agregara org_id
-- a products. SELECT p.* se expande al momento de crear la vista,
-- por lo que org_id no existia en las columnas de la vista.
-- ============================================================

DROP VIEW IF EXISTS products_with_inventory;

CREATE OR REPLACE VIEW products_with_inventory
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
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(units_sold) AS units_last_30d, SUM(revenue) AS revenue_last_30d
  FROM sales
  WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY product_id
) s ON s.product_id = p.id;
