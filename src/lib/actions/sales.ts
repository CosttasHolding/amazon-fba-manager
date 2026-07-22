"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "./get-org-id";
import { z } from "zod";

const createSaleSchema = z.object({
  product_id: z.string().uuid(),
  sale_date: z.string().min(1),
  units_sold: z.coerce.number().int().min(1),
  revenue: z.coerce.number().min(0),
  amazon_fees: z.coerce.number().min(0).default(0),
  order_id: z.string().max(255).nullable().optional(),
});

export async function createSale(data: {
  product_id: string;
  sale_date: string;
  units_sold: number;
  revenue: number;
  amazon_fees?: number;
  order_id?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autorizado");
  }

  const orgId = await getOrgId();

  const parse = createSaleSchema.safeParse(data);
  if (!parse.success) {
    throw new Error("Datos inválidos");
  }

  const { product_id, sale_date, units_sold, revenue, amazon_fees, order_id } = parse.data;

  if (revenue <= 0) {
    throw new Error("El revenue debe ser mayor a 0");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", product_id)
    .eq("org_id", orgId)
    .single();

  if (productError && productError.code !== "PGRST116") {
    throw new Error(productError.message);
  }

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      product_id,
      user_id: user.id,
      org_id: orgId,
      sale_date,
      units_sold,
      revenue,
      amazon_fees,
      order_id: order_id ?? null,
      source: "manual",
    })
    .select("*, products(name, sku)")
    .single();

  if (error) throw error;

  return sale;
}
