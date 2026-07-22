-- Make SKU optional for products
-- Nullable SKU allows products without SKU (PostgreSQL allows multiple NULLs in UNIQUE constraints)

ALTER TABLE products ALTER COLUMN sku DROP NOT NULL;
