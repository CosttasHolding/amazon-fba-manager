import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, buildAlertEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RuleWithUser {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  entity: string;
  condition_type: string;
  threshold: number | null;
  channel: string;
  enabled: boolean;
  last_triggered_at: string | null;
  users?: { email: string } | null;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const results: { ruleId: string; name: string; triggered: boolean; error?: string }[] = [];

    const { data: rules, error: rulesError } = await supabase
      .from("alert_rules")
      .select("*, users:user_id(email)")
      .eq("enabled", true)
      .not("org_id", "is", null) as { data: RuleWithUser[] | null; error: { message: string } | null };

    if (rulesError) return NextResponse.json({ error: "No se pudieron cargar las reglas" }, { status: 500 });

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: "No active rules", triggered: 0 });
    }

    const userIds = [...new Set(rules.map((r) => r.user_id))];
    const orgIds = [...new Set(rules.map((r) => r.org_id).filter((id): id is string => Boolean(id)))];
    const { data: allProducts, error: productsError } = await supabase
      .from("products_with_inventory")
      .select("*")
      .in("user_id", userIds)
      .in("org_id", orgIds);
    if (productsError) return NextResponse.json({ error: "No se pudieron cargar los productos" }, { status: 500 });

    const { data: campaigns, error: campaignsError } = await supabase
      .from("ppc_campaigns")
      .select("*")
      .eq("status", "enabled")
      .in("user_id", userIds)
      .in("org_id", orgIds);
    if (campaignsError) return NextResponse.json({ error: "No se pudieron cargar las campañas" }, { status: 500 });

    const { data: reorderRules, error: reorderRulesError } = await supabase
      .from("reorder_rules")
      .select("*")
      .eq("enabled", true)
      .in("user_id", userIds)
      .in("org_id", orgIds);
    if (reorderRulesError) return NextResponse.json({ error: "No se pudieron cargar las reglas de reorden" }, { status: 500 });

    // Fetch supplier names for all products that have alerts
    const productIds = (allProducts || []).map((p) => p.id);
    const supplierMap = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: psLinks, error: supplierError } = await supabase
        .from("product_suppliers")
        .select("product_id, suppliers!inner(id, name)")
        .in("product_id", productIds)
        .in("org_id", orgIds)
        .eq("is_primary", true);
      if (supplierError) return NextResponse.json({ error: "No se pudieron cargar los proveedores" }, { status: 500 });
      for (const link of psLinks || []) {
        const supplier = (link as Record<string, unknown>).suppliers as { id: string; name: string } | null;
        if (supplier?.name) {
          supplierMap.set(link.product_id, supplier.name);
        }
      }
    }

    const productsByTenant: Record<string, NonNullable<typeof allProducts>> = {};
    for (const p of allProducts || []) {
      const key = `${p.org_id}:${p.user_id}`;
      if (!productsByTenant[key]) productsByTenant[key] = [];
      productsByTenant[key]!.push(p);
    }

    const criticalErrors: string[] = [];
    for (const rule of rules) {
      try {
        if (!rule.org_id) continue;

        const { data: membership, error: membershipError } = await supabase
          .from("org_members")
          .select("user_id")
          .eq("user_id", rule.user_id)
          .eq("org_id", rule.org_id)
          .eq("status", "active")
          .maybeSingle();
        if (membershipError) {
          results.push({ ruleId: rule.id, name: rule.name, triggered: false, error: "Membership validation failed" });
          criticalErrors.push(`alert_rule:${rule.id}`);
          continue;
        }
        if (!membership) {
          results.push({ ruleId: rule.id, name: rule.name, triggered: false, error: "Inactive organization membership" });
          continue;
        }

        const tenantKey = `${rule.org_id}:${rule.user_id}`;
        const userProducts = productsByTenant[tenantKey] || [];
        let triggered = false;
        let severity: "critical" | "warning" | "info" = "warning";
        let title = "";
        let message = "";

        switch (rule.condition_type) {
          case "out_of_stock": {
            const oos = userProducts.filter((p) => p.stock_status === "out_of_stock");
            if (oos.length > (rule.threshold || 1)) {
              triggered = true;
              severity = "critical";
              title = `${oos.length} productos sin stock`;
              message = `${oos.map((p) => {
                const sn = supplierMap.get(p.id);
                return `${p.name} (${p.sku})${sn ? ` [${sn}]` : ""}`;
              }).join(", ")} necesitan reposicion urgente.`;
            }
            break;
          }
          case "low_stock": {
            const low = userProducts.filter((p) => p.stock_status === "low_stock");
            if (low.length > (rule.threshold || 1)) {
              triggered = true;
              severity = "warning";
              title = `${low.length} productos con stock bajo`;
              message = `${low.map((p) => {
                const sn = supplierMap.get(p.id);
                return `${p.name} (${p.sku})${sn ? ` [${sn}]` : ""}`;
              }).join(", ")} estan por debajo del punto de reorden.`;
            }
            break;
          }
          case "overstock": {
            const over = userProducts.filter((p) => p.stock_status === "overstock");
            if (over.length > (rule.threshold || 1)) {
              triggered = true;
              severity = "info";
              title = `${over.length} productos con exceso de stock`;
              message = `Capital inmovilizado: revisar rotacion de ${over.length} SKUs.`;
            }
            break;
          }
          case "low_margin": {
            const lowMargin = userProducts.filter((p) => {
              const margin = p.net_profit && p.sale_price ? (p.net_profit / p.sale_price) * 100 : 0;
              return margin < (rule.threshold || 10);
            });
            if (lowMargin.length > 0) {
              triggered = true;
              severity = "warning";
              title = `${lowMargin.length} productos con margen bajo`;
              message = `${lowMargin.map((p) => {
                const sn = supplierMap.get(p.id);
                return `${p.name}${sn ? ` [${sn}]` : ""}`;
              }).join(", ")} tienen margen menor al ${rule.threshold || 10}%. Revisar precios o costos.`;
            }
            break;
          }
          case "roi_below": {
            const lowRoi = userProducts.filter((p) => (p.roi || 0) < (rule.threshold || 10));
            if (lowRoi.length > 0) {
              triggered = true;
              severity = "warning";
              title = `${lowRoi.length} productos con ROI bajo`;
              message = `${lowRoi.map((p) => {
                const sn = supplierMap.get(p.id);
                return `${p.name}${sn ? ` [${sn}]` : ""}`;
              }).join(", ")} tienen ROI menor al ${rule.threshold || 10}%.`;
            }
            break;
          }
          case "ppc_overbudget": {
            const userCampaigns = (campaigns || []).filter((c) => c.user_id === rule.user_id && c.org_id === rule.org_id);
            const budgetThreshold = rule.threshold || 10;
            const overBudget = userCampaigns.filter((c) => (c.daily_budget || 0) > budgetThreshold);
            if (overBudget.length > 0) {
              triggered = true;
              severity = "warning";
              title = `${overBudget.length} campañas PPC sobre presupuesto`;
              message = `${overBudget.map((c) => c.campaign_name).join(", ")} exceden el presupuesto de $${budgetThreshold}/día.`;
            }
            break;
          }
        }

        if (triggered) {
          const { error: histErr } = await supabase.from("alert_history").insert({
            user_id: rule.user_id,
            org_id: rule.org_id,
            rule_id: rule.id,
            rule_name: rule.name,
            entity: rule.entity,
            condition_type: rule.condition_type,
            severity,
            title,
            message,
            channel_sent: rule.channel === "email" ? ["email"] : rule.channel === "both" ? ["in_app", "email"] : ["in_app"],
          });

          if (histErr) {
            results.push({ ruleId: rule.id, name: rule.name, triggered: true, error: histErr.message });
            continue;
          }

          const { error: updateError } = await supabase
            .from("alert_rules")
            .update({ last_triggered_at: new Date().toISOString() })
            .eq("id", rule.id)
            .eq("org_id", rule.org_id);
          if (updateError) {
            results.push({ ruleId: rule.id, name: rule.name, triggered: true, error: "Failed to update alert rule" });
            criticalErrors.push(`alert_rule_update:${rule.id}`);
            continue;
          }

          if (rule.channel === "email" || rule.channel === "both") {
            const typedRule = rule as RuleWithUser;
            const userEmail = typedRule.users?.email;
            if (userEmail) {
              await sendEmail({
                to: [userEmail],
                subject: `[FBA Manager] ${title}`,
                html: buildAlertEmailHtml({ title, message, severity }),
              });
            }
          }

          results.push({ ruleId: rule.id, name: rule.name, triggered: true });
        } else {
          results.push({ ruleId: rule.id, name: rule.name, triggered: false });
        }
      } catch (ruleErr) {
        results.push({ ruleId: rule.id, name: rule.name, triggered: false, error: String(ruleErr) });
      }
    }

    // Auto-reorder evaluation
    if (reorderRules && reorderRules.length > 0) {
      const reorderProductIds = reorderRules.map((rr) => rr.product_id).filter(Boolean);
      const { data: reorderProducts, error: reorderProductsError } = await supabase
        .from("products_with_inventory")
        .select("id, org_id, name, sku, unit_cost, stock_available, sales_velocity_30d")
        .in("id", reorderProductIds)
        .in("org_id", orgIds);
      if (reorderProductsError) return NextResponse.json({ error: "No se pudieron cargar los productos de reorden" }, { status: 500 });

      const reorderProductsMap = new Map((reorderProducts || []).map((p) => [`${p.org_id}:${p.id}`, p]));

      const reorderResults: { ruleId: string; productName: string; needsReorder: boolean }[] = [];
      for (const rr of reorderRules) {
        if (!rr.org_id) continue;

        const { data: membership, error: membershipError } = await supabase
          .from("org_members")
          .select("user_id")
          .eq("user_id", rr.user_id)
          .eq("org_id", rr.org_id)
          .eq("status", "active")
          .maybeSingle();
        if (membershipError) {
          criticalErrors.push(`reorder_rule_membership:${rr.id}`);
          continue;
        }
        if (!membership) continue;

        const product = reorderProductsMap.get(`${rr.org_id}:${rr.product_id}`) || null;
        if (!product) {
          criticalErrors.push(`reorder_rule_product:${rr.id}`);
          continue;
        }

        const stock = product.stock_available || 0;
        const needsReorder = stock <= rr.min_stock;

        const { error: evaluatedError } = await supabase
          .from("reorder_rules")
          .update({ last_evaluated_at: new Date().toISOString() })
          .eq("id", rr.id)
          .eq("org_id", rr.org_id);
        if (evaluatedError) {
          criticalErrors.push(`reorder_rule_update:${rr.id}`);
          continue;
        }

        if (needsReorder && rr.auto_po) {
          const velocity = product?.sales_velocity_30d || 0;
          const suggestedQty = Math.max(1, Math.ceil((rr.max_stock - stock) / Math.max(velocity / 30, 1)));

          const { count, error: purchaseOrderQueryError } = await supabase
            .from("purchase_orders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", rr.user_id)
            .eq("org_id", rr.org_id)
            .eq("product_id", rr.product_id)
            .in("status", ["draft", "sent", "confirmed"]);
          if (purchaseOrderQueryError) {
            criticalErrors.push(`purchase_order_lookup:${rr.id}`);
            continue;
          }

          if (count === 0) {
            const { error: purchaseOrderError } = await supabase.from("purchase_orders").insert({
              user_id: rr.user_id,
              org_id: rr.org_id,
              supplier_id: rr.supplier_id,
              product_id: rr.product_id,
              quantity: suggestedQty,
              unit_cost: product?.unit_cost || 0,
              status: "draft",
              notes: `Auto-generado por regla de reorden (mín: ${rr.min_stock}, máx: ${rr.max_stock})`,
            });
            if (purchaseOrderError) {
              criticalErrors.push(`purchase_order_insert:${rr.id}`);
              continue;
            }

            const { error: poUpdateError } = await supabase
              .from("reorder_rules")
              .update({ last_po_generated_at: new Date().toISOString() })
              .eq("id", rr.id)
              .eq("org_id", rr.org_id);
            if (poUpdateError) {
              criticalErrors.push(`reorder_rule_po_update:${rr.id}`);
              continue;
            }

            const { error: historyError } = await supabase.from("alert_history").insert({
              user_id: rr.user_id,
              org_id: rr.org_id,
              rule_name: `Auto-Reorder: ${product?.name || rr.product_id}`,
              entity: "inventory",
              condition_type: "low_stock",
              severity: "info",
              title: `PO generado para ${product?.name || "producto"}`,
              message: `Se generó un PO de ${suggestedQty} uds (stock actual: ${stock}, mínimo: ${rr.min_stock})`,
              channel_sent: ["in_app"],
            });
            if (historyError) {
              criticalErrors.push(`reorder_alert_history:${rr.id}`);
              continue;
            }
          }

          reorderResults.push({ ruleId: rr.id, productName: product?.name || "", needsReorder: true });
        } else {
          reorderResults.push({ ruleId: rr.id, productName: product?.name || "", needsReorder });
        }
      }
    }

    const triggered = results.filter((r) => r.triggered).length;
    return NextResponse.json({
      message: "Alert check complete",
      triggered,
      total: results.length,
      results,
      reorderRulesEvaluated: reorderRules?.length || 0,
      errors: criticalErrors,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
