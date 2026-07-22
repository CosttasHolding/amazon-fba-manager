import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, buildAlertEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RuleWithUser {
  id: string;
  user_id: string;
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
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const results: { ruleId: string; name: string; triggered: boolean; error?: string }[] = [];

    const { data: rules } = await supabase
      .from("alert_rules")
      .select("*, users:user_id(email)")
      .eq("enabled", true) as { data: RuleWithUser[] | null };

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: "No active rules", triggered: 0 });
    }

    const userIds = [...new Set(rules.map((r) => r.user_id))];
    const { data: allProducts } = await supabase
      .from("products_with_inventory")
      .select("*")
      .in("user_id", userIds);

    const { data: campaigns } = await supabase
      .from("ppc_campaigns")
      .select("*")
      .eq("status", "enabled")
      .in("user_id", userIds);

    const { data: reorderRules } = await supabase
      .from("reorder_rules")
      .select("*")
      .eq("enabled", true)
      .in("user_id", userIds);

    // Fetch supplier names for all products that have alerts
    const productIds = (allProducts || []).map((p) => p.id);
    const supplierMap = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: psLinks } = await supabase
        .from("product_suppliers")
        .select("product_id, suppliers!inner(id, name)")
        .in("product_id", productIds)
        .eq("is_primary", true);
      for (const link of psLinks || []) {
        const supplier = (link as Record<string, unknown>).suppliers as { id: string; name: string } | null;
        if (supplier?.name) {
          supplierMap.set(link.product_id, supplier.name);
        }
      }
    }

    const productsByUser: Record<string, NonNullable<typeof allProducts>> = {};
    for (const p of allProducts || []) {
      if (!productsByUser[p.user_id]) productsByUser[p.user_id] = [];
      productsByUser[p.user_id]!.push(p);
    }

    for (const rule of rules) {
      try {
        const userProducts = productsByUser[rule.user_id] || [];
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
            const userCampaigns = (campaigns || []).filter((c) => c.user_id === rule.user_id);
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

          await supabase
            .from("alert_rules")
            .update({ last_triggered_at: new Date().toISOString() })
            .eq("id", rule.id);

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
      const { data: reorderProducts } = await supabase
        .from("products_with_inventory")
        .select("id, name, sku, stock_available, sales_velocity_30d")
        .in("id", reorderProductIds);

      const reorderProductsMap = new Map((reorderProducts || []).map((p) => [p.id, p]));

      const reorderResults: { ruleId: string; productName: string; needsReorder: boolean }[] = [];
      for (const rr of reorderRules) {
        const product = reorderProductsMap.get(rr.product_id) || null;

        const stock = product?.stock_available || 0;
        const needsReorder = stock <= rr.min_stock;

        await supabase
          .from("reorder_rules")
          .update({ last_evaluated_at: new Date().toISOString() })
          .eq("id", rr.id);

        if (needsReorder && rr.auto_po) {
          const velocity = product?.sales_velocity_30d || 0;
          const suggestedQty = Math.max(1, Math.ceil((rr.max_stock - stock) / Math.max(velocity / 30, 1)));

          const { count } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", rr.user_id)
            .eq("product_id", rr.product_id)
            .in("status", ["draft", "sent", "confirmed"]);

          if (count === 0) {
            await supabase.from("orders").insert({
              user_id: rr.user_id,
              supplier_id: rr.supplier_id,
              product_id: rr.product_id,
              quantity: suggestedQty,
              status: "draft",
              notes: `Auto-generado por regla de reorden (mín: ${rr.min_stock}, máx: ${rr.max_stock})`,
            });

            await supabase
              .from("reorder_rules")
              .update({ last_po_generated_at: new Date().toISOString() })
              .eq("id", rr.id);

            await supabase.from("alert_history").insert({
              user_id: rr.user_id,
              rule_name: `Auto-Reorder: ${product?.name || rr.product_id}`,
              entity: "inventory",
              condition_type: "low_stock",
              severity: "info",
              title: `PO generado para ${product?.name || "producto"}`,
              message: `Se generó un PO de ${suggestedQty} uds (stock actual: ${stock}, mínimo: ${rr.min_stock})`,
              channel_sent: ["in_app"],
            });
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
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
