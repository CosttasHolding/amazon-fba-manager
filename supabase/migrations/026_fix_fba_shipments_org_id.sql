-- FIX: Add org_id to fba_shipments (missed in 024)

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fba_shipments')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fba_shipments' AND column_name = 'org_id') THEN
    ALTER TABLE fba_shipments ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fba_shipment_items')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fba_shipment_items' AND column_name = 'org_id') THEN
    ALTER TABLE fba_shipment_items ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fba_shipments_org ON fba_shipments(org_id);
