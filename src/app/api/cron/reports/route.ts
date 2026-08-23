import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, buildAlertEmailHtml } from "@/lib/email";
import { calculateNextRunAt, type ScheduleTiming } from "@/lib/schedules";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ScheduleWithUser {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  template: string;
  frequency: ScheduleTiming["frequency"];
  day_of_week: number | null;
  day_of_month: number | null;
  time: string;
  channel: string;
  format: "pdf" | "excel" | "both";
  enabled: boolean;
  next_run_at: string | null;
  last_sent_at: string | null;
  users?: { email: string; name: string } | null;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { data: schedules, error: schedulesError } = await supabase
      .from("scheduled_reports")
      .select("*, users:user_id(email, name)")
      .eq("enabled", true)
      .lte("next_run_at", new Date().toISOString())
      .not("org_id", "is", null) as { data: ScheduleWithUser[] | null; error: { message: string } | null };

    if (schedulesError) return NextResponse.json({ error: "No se pudieron cargar los reportes" }, { status: 500 });

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: "No due schedules", generated: 0 });
    }

    const generated: { id: string; name: string; template: string }[] = [];
    const failures: { id: string; name: string; error: string }[] = [];

    for (const sched of schedules) {
      try {
        const orgId = sched.org_id;
        if (!orgId) continue;

        const { data: membership, error: membershipError } = await supabase
          .from("org_members")
          .select("user_id")
          .eq("user_id", sched.user_id)
          .eq("org_id", orgId)
          .eq("status", "active")
          .maybeSingle();
        if (membershipError) {
          failures.push({ id: sched.id, name: sched.name, error: "Membership validation failed" });
          continue;
        }
        if (!membership) {
          failures.push({ id: sched.id, name: sched.name, error: "Inactive organization membership" });
          continue;
        }

        if (sched.format !== "excel") {
          failures.push({ id: sched.id, name: sched.name, error: "Only Excel scheduled reports are supported" });
          continue;
        }

        const user = sched.users;
        let rows: Record<string, unknown>[] = [];

        switch (sched.template) {
          case "profitability": {
            const { data: products, error: productsError } = await supabase
              .from("products_with_inventory")
              .select("name, sku, category, sale_price, unit_cost, net_profit, roi, sales_velocity_30d, stock_available")
              .eq("user_id", sched.user_id)
              .eq("org_id", orgId)
              .eq("status", "active");
            if (productsError) throw new Error("Products query failed");
            rows = (products || []).map((p) => ({
              Producto: p.name,
              SKU: p.sku,
              Categoría: p.category || "—",
              Precio: p.sale_price,
              Costo: p.unit_cost,
              Ganancia: p.net_profit,
              ROI: p.roi ? `${p.roi.toFixed(1)}%` : "—",
              Ventas_30d: p.sales_velocity_30d,
              Stock: p.stock_available,
            }));
            break;
          }
          case "inventory": {
            const { data: products, error: productsError } = await supabase
              .from("products_with_inventory")
              .select("name, sku, stock_available, stock_status, sales_velocity_30d")
              .eq("user_id", sched.user_id)
              .eq("org_id", orgId);
            if (productsError) throw new Error("Products query failed");
            rows = (products || []).map((p) => ({
              Producto: p.name,
              SKU: p.sku,
              Stock: p.stock_available,
              Estado: p.stock_status,
              Velocidad_30d: p.sales_velocity_30d,
            }));
            break;
          }
          case "sales-summary": {
            const since = new Date();
            since.setDate(since.getDate() - 30);
            const { data: sales, error: salesError } = await supabase
              .from("sales")
              .select("sale_date, revenue, units_sold")
              .eq("user_id", sched.user_id)
              .eq("org_id", orgId)
              .gte("sale_date", since.toISOString())
              .order("sale_date", { ascending: true });
            if (salesError) throw new Error("Sales query failed");
            rows = (sales || []).map((s) => ({
              Fecha: s.sale_date,
              Revenue: s.revenue,
              Unidades: s.units_sold,
            }));
            break;
          }
          case "roi-ranking": {
            const { data: products, error: productsError } = await supabase
              .from("products_with_inventory")
              .select("name, sku, roi, net_profit, sale_price, sales_velocity_30d")
              .eq("user_id", sched.user_id)
              .eq("org_id", orgId)
              .order("roi", { ascending: false, nullsFirst: false });
            if (productsError) throw new Error("Products query failed");
            rows = (products || []).map((p, i) => ({
              "#": i + 1,
              Producto: p.name,
              SKU: p.sku,
              ROI: p.roi ? `${p.roi.toFixed(1)}%` : "—",
              Ganancia: p.net_profit,
              Precio: p.sale_price,
              Ventas_30d: p.sales_velocity_30d,
            }));
            break;
          }
        }

        if (rows.length === 0) {
          rows = [{ Mensaje: "No hay datos disponibles para este reporte" }];
        }

        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, "Reporte");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        const filename = `${sched.template}-${new Date().toISOString().split("T")[0]}.xlsx`;
        const storagePath = `${orgId}/${sched.user_id}/${filename}`;

        const { error: storageError } = await supabase.storage
          .from("reportes")
          .upload(storagePath, excelBuffer, {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            upsert: true,
          });

        if (storageError) {
          const { error: historyError } = await supabase.from("alert_history").insert({
            user_id: sched.user_id,
            org_id: orgId,
            rule_name: `Reporte programado: ${sched.name}`,
            entity: "inventory",
            condition_type: "low_stock",
            severity: "warning",
            title: `Error al generar reporte: ${sched.name}`,
            message: `No se pudo guardar el archivo: ${storageError.message}`,
            channel_sent: ["in_app"],
          });
          failures.push({
            id: sched.id,
            name: sched.name,
            error: historyError ? "Report storage and error logging failed" : "Report storage failed",
          });
          continue;
        } else {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from("reportes")
            .createSignedUrl(storagePath, 60 * 60);

          if (signedUrlError || !signedUrlData?.signedUrl) {
            const { error: historyError } = await supabase.from("alert_history").insert({
              user_id: sched.user_id,
              org_id: orgId,
              rule_name: `Reporte programado: ${sched.name}`,
              entity: "inventory",
              condition_type: "low_stock",
              severity: "critical",
              title: `Error al generar enlace: ${sched.name}`,
              message: "No se pudo crear el enlace seguro del reporte.",
              channel_sent: ["in_app"],
            });
            failures.push({
              id: sched.id,
              name: sched.name,
              error: historyError ? "Signed URL and error logging failed" : "Signed URL creation failed",
            });
            continue;
          }

          const signedUrl = signedUrlData.signedUrl;

          const { error: historyError } = await supabase.from("alert_history").insert({
            user_id: sched.user_id,
            org_id: orgId,
            rule_name: `Reporte programado: ${sched.name}`,
            entity: "inventory",
            condition_type: "low_stock",
            severity: "info",
            title: `Reporte generado: ${sched.name}`,
            message: `Reporte ${filename} disponible para descarga.`,
            metadata: { url: signedUrl },
            channel_sent: (sched.channel === "in_app" || sched.channel === "both" ? ["in_app"] : [])
              .concat(sched.channel === "email" || sched.channel === "both" ? ["email"] : []),
          });

          if (historyError) {
            failures.push({ id: sched.id, name: sched.name, error: "Report history insert failed" });
            continue;
          }

          if ((sched.channel === "email" || sched.channel === "both") && user?.email) {
            await sendEmail({
              to: [user.email],
              subject: `[FBA Manager] Reporte: ${sched.name}`,
              html: buildAlertEmailHtml({
                title: `Reporte generado: ${sched.name}`,
                message: `Tu reporte ${sched.template} está listo. Descárgalo desde la sección de alertas o usa el enlace seguro: ${signedUrl}`,
                severity: "info",
              }),
            });
          }

        }

        const nextRun = calculateNextRunAt({
          frequency: sched.frequency,
          time: sched.time,
          day_of_week: sched.day_of_week,
          day_of_month: sched.day_of_month,
        });

        const { error: scheduleUpdateError } = await supabase
          .from("scheduled_reports")
          .update({
            last_sent_at: new Date().toISOString(),
            next_run_at: nextRun,
          })
          .eq("id", sched.id)
          .eq("org_id", orgId);
        if (scheduleUpdateError) {
          failures.push({ id: sched.id, name: sched.name, error: "Failed to update report schedule" });
          continue;
        }

        generated.push({ id: sched.id, name: sched.name, template: sched.template });
      } catch (err) {
        const orgId = sched.org_id;
        if (!orgId) continue;
        const { error: historyError } = await supabase.from("alert_history").insert({
          user_id: sched.user_id,
          org_id: orgId,
          rule_name: `Reporte programado: ${sched.name}`,
          entity: "inventory",
          condition_type: "low_stock",
          severity: "critical",
          title: `Error generando reporte: ${sched.name}`,
          message: String(err),
          channel_sent: ["in_app"],
        });
        failures.push({
          id: sched.id,
          name: sched.name,
          error: historyError ? "Report failed and error logging failed" : "Report generation failed",
        });
      }
    }

    return NextResponse.json({
      message: "Report generation complete",
      generated: generated.length,
      schedules: generated,
      failures,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
