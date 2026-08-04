ALTER TABLE product_research ADD COLUMN IF NOT EXISTS estimated_monthly_revenue INTEGER;
ALTER TABLE product_research ADD COLUMN IF NOT EXISTS estimated_fba_fee DECIMAL(10,2);
ALTER TABLE product_research ADD COLUMN IF NOT EXISTS seller_count_fba INTEGER;