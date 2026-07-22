"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "./get-org-id";
import { orderSchema } from "@/validations/order";
import { z } from "zod";

export async function createOrder(data: z.infer<typeof orderSchema>) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No autorizado");
  }

  const orgId = await getOrgId();

  const result = orderSchema.safeParse(data);
  if (!result.success) {
    throw new Error("Datos inválidos");
  }

  const { total_cost, ...rest } = result.data;
  const clean = { ...rest, user_id: user.id, org_id: orgId };

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .insert(clean)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return order;
}
