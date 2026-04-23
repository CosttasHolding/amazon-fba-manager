import { z } from "zod";

export const fbaShipmentSchema = z.object({
  shipment_name: z.string().min(1).max(200),
  shipment_id: z.string().max(100).nullable().optional(),
  amazon_reference_id: z.string().max(100).nullable().optional(),
  destination_fulfillment_center: z.string().max(50).nullable().optional(),
  destination_address: z.string().max(500).nullable().optional(),
  status: z.enum(["working","ready_to_ship","shipped","in_transit","delivered","checked_in","receiving","closed","cancelled"]).optional(),
  shipping_method: z.enum(["small_parcel","ltl","ftl","air","sea"]).nullable().optional(),
  carrier: z.string().max(100).nullable().optional(),
  tracking_number: z.string().max(100).nullable().optional(),
  box_count: z.coerce.number().int().min(0).optional(),
  total_units: z.coerce.number().int().min(0).optional(),
  total_weight_kg: z.coerce.number().min(0).nullable().optional(),
  shipping_cost: z.coerce.number().min(0).optional(),
  ship_date: z.string().nullable().optional(),
  estimated_arrival: z.string().nullable().optional(),
  actual_arrival: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
