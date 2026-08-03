ALTER TABLE product_research DROP CONSTRAINT IF EXISTS product_research_competition_level_check;
ALTER TABLE product_research ADD CONSTRAINT product_research_competition_level_check
  CHECK (competition_level IN ('very_low','low','medium','high','very_high'));