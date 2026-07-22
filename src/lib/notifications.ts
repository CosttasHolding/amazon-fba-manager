import { createClient } from "@/lib/supabase/server";
import { Notification, NotificationPriority } from "@/types";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  stock_status: string;
  status: string;
  stock_available: number;
  reorder_point: number | null;
  max_stock: number | null;
  days_of_stock: number | null;
  sale_price: number | null;
  net_profit: number | null;
}

export async function generateNotifications(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ created: number; notifications: Notification[] }> {
  const { data: products } = await supabase
    .from("products_with_inventory")
    .select("*")
    .eq("user_id", userId);

  const allProducts = (products || []) as ProductRow[];

  const alertProductIds = allProducts
    .filter(
      (p) =>
        (p.stock_status === "out_of_stock" ||
          p.stock_status === "low_stock" ||
          p.stock_status === "overstock" ||
          (p.status === "active" && p.sale_price && p.sale_price > 0 &&
            ((p.net_profit || 0) / (p.sale_price || 1)) * 100 > 0 &&
            ((p.net_profit || 0) / (p.sale_price || 1)) * 100 < 10))
    )
    .map((p) => p.id);

  const supplierMap = new Map<string, string>();
  if (alertProductIds.length > 0) {
    const { data: psLinks } = await supabase
      .from("product_suppliers")
      .select("product_id, suppliers!inner(id, name)")
      .in("product_id", alertProductIds)
      .eq("is_primary", true);

    for (const link of psLinks || []) {
      const supplier = (link as Record<string, unknown>).suppliers as { id: string; name: string } | null;
      if (supplier?.name) {
        supplierMap.set(link.product_id, supplier.name);
      }
    }
  }

  const now = new Date().toISOString();
  const notifications: Notification[] = [];

  // 1. Out of stock (CRITICAL)
  for (const p of allProducts.filter(
    (p) => p.stock_status === "out_of_stock" && p.status === "active"
  )) {
    const sn = supplierMap.get(p.id);
    const supplierText = sn ? ` (Proveedor: ${sn})` : "";
    notifications.push({
      id: `oos-${p.id}`,
      type: "out_of_stock",
      priority: "critical",
      title: "Sin stock",
      message: `${p.name} (${p.sku}) no tiene unidades disponibles. Las ventas estan detenidas.${supplierText}`,
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku,
      supplier_name: sn || undefined,
      read: false,
      persistent: false,
      created_at: now,
    });
  }

  // 2. Low stock (WARNING)
  for (const p of allProducts.filter(
    (p) => p.stock_status === "low_stock" && p.status === "active"
  )) {
    const daysLeft = p.days_of_stock;
    const daysText =
      daysLeft !== null && daysLeft !== undefined
        ? ` (~${Math.round(daysLeft)} dias restantes)`
        : "";
    const sn = supplierMap.get(p.id);
    const supplierText = sn ? ` (Proveedor: ${sn})` : "";
    notifications.push({
      id: `ls-${p.id}`,
      type: "low_stock",
      priority: "warning",
      title: "Stock bajo",
      message: `${p.name} (${p.sku}) tiene ${p.stock_available} uds. por debajo del punto de reorden (${p.reorder_point})${daysText}.${supplierText}`,
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku,
      supplier_name: sn || undefined,
      read: false,
      persistent: false,
      created_at: now,
    });
  }

  // 3. Overstock (INFO)
  for (const p of allProducts.filter(
    (p) => p.stock_status === "overstock" && p.status === "active"
  )) {
    const excess = p.stock_available - (p.max_stock || 0);
    const sn = supplierMap.get(p.id);
    const supplierText = sn ? ` (Proveedor: ${sn})` : "";
    notifications.push({
      id: `os-${p.id}`,
      type: "overstock",
      priority: "info",
      title: "Sobrestock",
      message: `${p.name} (${p.sku}) tiene ${p.stock_available} uds. (${excess > 0 ? `+${excess}` : excess} sobre el maximo de ${p.max_stock}).${supplierText}`,
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku,
      supplier_name: sn || undefined,
      read: false,
      persistent: false,
      created_at: now,
    });
  }

  // 4. Low margin (WARNING) — products with margin < 10%
  for (const p of allProducts.filter(
    (p) => p.status === "active" && p.sale_price && p.sale_price > 0
  )) {
    const margin = ((p.net_profit || 0) / (p.sale_price || 1)) * 100;
    if (margin > 0 && margin < 10) {
      const sn = supplierMap.get(p.id);
      const supplierText = sn ? ` (Proveedor: ${sn})` : "";
      notifications.push({
        id: `lm-${p.id}`,
        type: "low_margin",
        priority: "warning",
        title: "Margen bajo",
        message: `${p.name} (${p.sku}) tiene un margen de solo ${margin.toFixed(1)}%. Considera ajustar precios o costos.${supplierText}`,
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        supplier_name: sn || undefined,
        read: false,
        persistent: false,
        created_at: now,
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<NotificationPriority, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3,
  };
  notifications.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Persist to DB — batch duplicate check (single query instead of N)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let created = 0;

  if (notifications.length > 0) {
    const types = [...new Set(notifications.map((n) => n.type))];
    const { data: existingDups } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
      .eq("read", false)
      .gte("created_at", cutoff)
      .in("type", types);

    const existingTypes = new Set((existingDups || []).map((d) => d.type));

    const toInsert = notifications
      .filter((n) => !existingTypes.has(n.type))
      .map((n) => ({
        user_id: userId,
        type: n.type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        product_id: n.product_id || null,
        product_name: n.product_name || null,
        product_sku: n.product_sku || null,
        read: false,
        sent_external: false,
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("notifications").insert(toInsert);
      if (!error) created = toInsert.length;
    }
  }

  return { created, notifications };
}
