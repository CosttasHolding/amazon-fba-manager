-- ============================================================
-- REPAIR 004: Fix products_real_profit view security & correctness
-- ============================================================
-- The original view subqueries did not filter by user_id, causing:
-- 1. Data leakage: aggregates included other users' data
-- 2. Incorrect profit calculations
-- Views in PostgreSQL run with owner privileges, so RLS on
-- underlying tables is NOT applied inside subqueries.
-- Fix: group and join by (product_id, user_id).
-- ============================================================

CREATE OR REPLACE VIEW products_real_profit AS
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
  (COALESCE(s.total_revenue, 0) - COALESCE(r.total_refund_amount, 0) - COALESCE(e.total_expenses, 0) + COALESCE(re.total_reimbursements, 0)) AS real_net_profit
FROM products p
LEFT JOIN (
  SELECT product_id, user_id, SUM(revenue) AS total_revenue, SUM(units_sold) AS total_units
  FROM sales GROUP BY product_id, user_id
) s ON s.product_id = p.id AND s.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(quantity) AS total_returns, SUM(refund_amount) AS total_refund_amount
  FROM returns GROUP BY product_id, user_id
) r ON r.product_id = p.id AND r.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(amount) AS total_expenses
  FROM expenses
  WHERE product_id IS NOT NULL
  GROUP BY product_id, user_id
) e ON e.product_id = p.id AND e.user_id = p.user_id
LEFT JOIN (
  SELECT product_id, user_id, SUM(amount) AS total_reimbursements
  FROM reimbursements
  WHERE status = 'paid'
  GROUP BY product_id, user_id
) re ON re.product_id = p.id AND re.user_id = p.user_id;

-- NOTE: monthly_financial_summary in 003_finances.sql already filters by user_id
-- and is used for expense categorization. Do NOT redefine it here to avoid
-- breaking change. The original view is correct for its purpose.
