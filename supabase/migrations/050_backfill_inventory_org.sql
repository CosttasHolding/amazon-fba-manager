UPDATE public.inventory AS inventory_row
SET org_id = product_row.org_id
FROM public.products AS product_row
WHERE inventory_row.product_id = product_row.id
  AND inventory_row.org_id IS NULL
  AND product_row.org_id IS NOT NULL;
