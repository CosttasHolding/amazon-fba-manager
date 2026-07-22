"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "./get-org-id";
import { supplierSchema } from "@/validations/supplier";
import { z } from "zod";

type SupplierInput = z.infer<typeof supplierSchema>;

export async function createSupplier(data: SupplierInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autorizado");
  }

  const orgId = await getOrgId();

  const result = supplierSchema.safeParse(data);
  if (!result.success) {
    throw new Error("Datos inválidos");
  }

  const cleanData = {
    ...result.data,
    user_id: user.id,
    org_id: orgId,
    alibaba_url: result.data.alibaba_url || null,
    contact_name: result.data.contact_name || null,
    contact_email: result.data.contact_email || null,
    contact_whatsapp: result.data.contact_whatsapp || null,
    country: result.data.country || null,
    rating: result.data.rating ?? null,
    payment_terms: result.data.payment_terms || null,
    min_order_qty: result.data.min_order_qty ?? null,
    lead_time_days: result.data.lead_time_days ?? null,
    notes: result.data.notes || null,
  };

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert(cleanData)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return supplier;
}
