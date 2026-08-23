export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async ({ supabase, orgId }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  const { data: rules, error } = await supabase
    .from("reorder_rules")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withProducts = await Promise.all(
    (rules || []).map(async (rule) => {
      const { data: product } = await supabase
        .from("products_with_inventory")
        .select("name, sku, stock_available, sales_velocity_30d")
        .eq("id", rule.product_id)
        .eq("org_id", orgId)
        .single();

      let supplierName: string | null = null;
      if (rule.supplier_id) {
          const { data: supplier } = await supabase
          .from("suppliers")
          .select("name")
          .eq("id", rule.supplier_id)
          .eq("org_id", orgId)
          .single();
        supplierName = supplier?.name || null;
      }

      const velocity = product?.sales_velocity_30d || 0;
      const dailyVelocity = velocity / 30;
      const stock = product?.stock_available || 0;
      const suggestedQty = dailyVelocity > 0
        ? Math.max(0, Math.ceil((rule.max_stock - stock) / (dailyVelocity > 0 ? 1 : 1)))
        : 0;
      const needsReorder = stock <= rule.min_stock;

      return {
        ...rule,
        product_name: product?.name || null,
        product_sku: product?.sku || null,
        product_stock: product?.stock_available || 0,
        product_velocity: velocity,
        supplier_name: supplierName,
        suggested_qty: needsReorder ? suggestedQty : 0,
      };
    })
  );

  return NextResponse.json({ data: withProducts });
});

export const POST = createApiHandler(async ({ supabase, user, orgId, role, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
  if (!role || !["owner", "admin", "editor"].includes(role)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }
  const body = await req.json();
  const { product_id, supplier_id, min_stock, max_stock, auto_po, lead_time_days, safety_stock_days, notes } = body;

  if (!product_id) {
    return NextResponse.json({ error: "product_id es requerido" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", product_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Producto no pertenece a la organización" }, { status: 400 });

  if (supplier_id) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplier_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!supplier) return NextResponse.json({ error: "Proveedor no pertenece a la organización" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reorder_rules")
    .insert({
      user_id: user.id,
      org_id: orgId,
      product_id,
      supplier_id: supplier_id || null,
      min_stock: min_stock ?? 10,
      max_stock: max_stock ?? 100,
      auto_po: auto_po ?? false,
      lead_time_days: lead_time_days ?? 30,
      safety_stock_days: safety_stock_days ?? 14,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
});

export const PATCH = createApiHandler(async ({ supabase, orgId, role, req }) => {
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!role || !["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }
    const body = await req.json();
    const { id, ...rawUpdates } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const ALLOWED_FIELDS = ["product_id", "supplier_id", "min_stock", "max_stock", "auto_po", "lead_time_days", "safety_stock_days", "notes"];
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in rawUpdates) updates[key] = rawUpdates[key];
    }

    if (typeof updates.product_id === "string") {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("id", updates.product_id)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!product) return NextResponse.json({ error: "Producto no pertenece a la organización" }, { status: 400 });
    }

    if (typeof updates.supplier_id === "string") {
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", updates.supplier_id)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!supplier) return NextResponse.json({ error: "Proveedor no pertenece a la organización" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reorder_rules")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
    return NextResponse.json({ data });
});

export const DELETE = createApiHandler(async ({ supabase, orgId, role, req }) => {
    if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });
    if (!role || !["owner", "admin", "editor"].includes(role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { error } = await supabase
      .from("reorder_rules")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
    return NextResponse.json({ success: true });
});
