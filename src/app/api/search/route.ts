export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";

type SearchResultType = "product" | "supplier" | "order" | "research";

interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
}

interface SupplierRow {
  id: string;
  name: string;
  country: string | null;
}

interface OrderRow {
  id: string;
  po_number: string | null;
  suppliers: { name: string } | { name: string }[] | null;
}

interface ResearchRow {
  id: string;
  name: string;
  niche: string | null;
}

export const GET = createApiHandler(async ({ supabase, orgId, req }) => {
  if (!orgId) return NextResponse.json({ error: "No hay organización activa" }, { status: 400 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ data: [] });

  const clean = q.replace(/[%_]/g, "\\$&");
  const like = `%${clean}%`;

  const [productsRes, suppliersRes, ordersRes, researchRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku")
      .eq("org_id", orgId)
      .or(`name.ilike.${like},sku.ilike.${like}`)
      .limit(5),
    supabase
      .from("suppliers")
      .select("id, name, country")
      .eq("org_id", orgId)
      .or(`name.ilike.${like},contact_name.ilike.${like},country.ilike.${like}`)
      .limit(5),
    supabase
      .from("purchase_orders")
      .select("id, po_number, suppliers(name)")
      .eq("org_id", orgId)
      .ilike("po_number", like)
      .limit(5),
    supabase
      .from("product_research")
      .select("id, name, niche")
      .eq("org_id", orgId)
      .ilike("name", like)
      .limit(5),
  ]);

  const data: SearchResultItem[] = [];

  ((productsRes.data || []) as ProductRow[]).forEach((p) => {
    data.push({ id: p.id, type: "product", title: p.name, subtitle: p.sku || "", href: `/products/${p.id}` });
  });
  ((suppliersRes.data || []) as SupplierRow[]).forEach((s) => {
    data.push({ id: s.id, type: "supplier", title: s.name, subtitle: s.country || "", href: `/suppliers/${s.id}` });
  });
  ((ordersRes.data || []) as OrderRow[]).forEach((o) => {
    const supplierName = Array.isArray(o.suppliers) ? o.suppliers[0]?.name : o.suppliers?.name;
    data.push({ id: o.id, type: "order", title: o.po_number || `PO-${o.id.slice(0, 8)}`, subtitle: supplierName || "", href: `/orders/${o.id}` });
  });
  ((researchRes.data || []) as ResearchRow[]).forEach((r) => {
    data.push({ id: r.id, type: "research", title: r.name, subtitle: r.niche || "", href: "/research" });
  });

  return NextResponse.json({ data });
});
