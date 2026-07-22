export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const importRowSchema = z.object({
  date: z.string().min(1),
  sku: z.string().min(1),
  units: z.coerce.number().int().min(1),
  revenue: z.coerce.number().min(0).optional(),
});

const importBodySchema = z.object({
  rows: z.array(importRowSchema).min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = user.user_metadata?.org_id as string;
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

    const body = await req.json();
    const parse = importBodySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { rows } = parse.data;
    const skus = [...new Set(rows.map((r) => r.sku))];

    const { data: products } = await supabase
      .from("products")
      .select("id, sku, sale_price")
      .eq("org_id", orgId)
      .in("sku", skus);

    const skuToProduct = new Map(
      (products || []).map((p) => [p.sku, p])
    );

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const inserts: Array<Record<string, unknown>> = [];

      for (const row of batch) {
        const product = skuToProduct.get(row.sku);
        if (!product) {
          skipped++;
          errors.push(`SKU "${row.sku}" no encontrado`);
          continue;
        }

        const revenue = row.revenue ?? (product.sale_price || 0) * row.units;

        inserts.push({
          user_id: user.id,
          org_id: orgId,
          product_id: product.id,
          sale_date: row.date,
          units_sold: row.units,
          revenue,
          amazon_fees: 0,
          net_revenue: revenue,
          source: "csv_import",
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("sales").insert(inserts);
        if (error) {
          errors.push(`Error en lote: ${error.message}`);
          skipped += inserts.length;
        } else {
          imported += inserts.length;
        }
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en importación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
