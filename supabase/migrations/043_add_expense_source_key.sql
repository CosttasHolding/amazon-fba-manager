ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS source_key TEXT;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_source_key_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_org_source_key_key'
      AND conrelid = 'public.expenses'::regclass
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_org_source_key_key UNIQUE (org_id, source_key);
  END IF;
END $$;
