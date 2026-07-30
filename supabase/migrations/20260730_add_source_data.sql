ALTER TABLE product_research
ADD COLUMN IF NOT EXISTS source_data JSONB;
