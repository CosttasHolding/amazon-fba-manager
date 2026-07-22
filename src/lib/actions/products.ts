"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "./get-org-id";
import { productSchema } from "@/validations/product";
import { z } from "zod";

type ProductInput = z.infer<typeof productSchema>;

export async function createProduct(data: ProductInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const orgId = await getOrgId();

  const validated = productSchema.parse(data);

  const dbData = {
    user_id: user.id,
    org_id: orgId,
    sku: validated.sku || null,
    asin: validated.asin || null,
    name: validated.name,
    category: validated.category || null,
    weight_kg: validated.weightKg || null,
    marketplace: validated.marketplace,
    unit_cost: validated.unitCost,
    shipping_cost: validated.shippingCost,
    prep_cost: validated.prepCost,
    taxes: validated.taxes,
    sale_price: validated.salePrice,
    referral_fee: validated.referralFee,
    fba_fee: validated.fbaFee,
    storage_fee_monthly: validated.storageFeeMonthly,
    other_fees: validated.otherFees,
    status: validated.status,
    notes: validated.notes || null,
  };

  const { data: product, error } = await supabase
    .from("products")
    .insert(dbData)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return product;
}
