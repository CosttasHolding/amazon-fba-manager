import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, buildAlertEmailHtml } from "@/lib/email";
import * as XLSX from "xlsx";
import { addDays, addWeeks, addMonths, setHours, setMinutes, setSeconds } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ScheduleWithUser {
  id: string;
  user_id: string;
  name: string;
  template: string;
  frequency: string;
  channel: string;
  enabled: boolean;
  next_run_at: string | null;
  last_sent_at: string | null;
  users?: { email: string; name: string } | null;
}

function calcNextRun(frequency: string, from: Date): string {
  let next = new Date(from);
  next.setHours(8, 0, 0, 0);
  if (next <= from) {
    if (frequency === "daily") next = addDays(next, 1);
    else if (frequency === "weekly") next = addWeeks(next, 1);
    else if (frequency === "monthly") next = addMonths(next, 1);
  }
  return next.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { data: schedules } = await supabase
      .from("scheduled_reports")
      .select("*, users:user_id(email, name)")
      .eq("enabled", true)
      .lte("next_run_at", new Date().toISOString()) as { data: ScheduleWithUser[] | null };

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: "No due schedules", generated: 0 });
    }

    const generated: { id: string; name: string; template: string }[] = [];

    for (const sched of schedules) {
      try {
        const user = sched.users;
        let rows: Record<string, unknown>[] = [];

        switch (sched.template) {
          case "profitability": {
            const { data: products } = await supabase
              .from("products_with_inventory")
              .select("name, sku, category, sale_price, buy_cost, net_profit, roi, sales_velocity_30d, stock_available")
              .eq("user_id", sched.user_id)
              .eq("status", "active");
            rows = (products || []).map((p) => ({
              Producto: p.name,
              SKU: p.sku,
              Categoría: p.category || "—",
              Precio: p.sale_price,
              Costo: p.buy_cost,
              Ganancia: p.net_profit,
              ROI: p.roi ? `${p.roi.toFixed(1)}%` : "—",
              Ventas_30d: p.sales_velocity_30d,
              Stock: p.stock_available,
            }));
            break;
          }
          case "inventory": {
            const { data: products } = await supabase
              .from("products_with_inventory")
              .select("name, sku, stock_available, stock_status, sales_velocity_30d")
              .eq("user_id", sched.user_id);
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
            const { data: sales } = await supabase
              .from("sales")
              .select("sale_date, revenue, units_sold")
              .eq("user_id", sched.user_id)
              .gte("sale_date", since.toISOString())
              .order("sale_date", { ascending: true });
            rows = (sales || []).map((s) => ({
              Fecha: s.sale_date,
              Revenue: s.revenue,
              Unidades: s.units_sold,
            }));
            break;
          }
          case "roi-ranking": {
            const { data: products } = await supabase
              .from("products_with_inventory")
              .select("name, sku, roi, net_profit, sale_price, sales_velocity_30d")
              .eq("user_id", sched.user_id)
              .order("roi", { ascending: false, nullsFirst: false });
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

        const { error: storageError } = await supabase.storage
          .from("reportes")
          .upload(`${sched.user_id}/${filename}`, excelBuffer, {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            upsert: true,
          });

        if (storageError) {
          await supabase.from("alert_history").insert({
            user_id: sched.user_id,
            rule_name: `Reporte programado: ${sched.name}`,
            entity: "inventory",
            condition_type: "low_stock",
            severity: "warning",
            title: `Error al generar reporte: ${sched.name}`,
            message: `No se pudo guardar el archivo: ${storageError.message}`,
            channel_sent: ["in_app"],
          });
        } else {
          const publicUrl = supabase.storage.from("reportes").getPublicUrl(`${sched.user_id}/${filename}`).data.publicUrl;

          await supabase.from("alert_history").insert({
            user_id: sched.user_id,
            rule_name: `Reporte programado: ${sched.name}`,
            entity: "inventory",
            condition_type: "low_stock",
            severity: "info",
            title: `Reporte generado: ${sched.name}`,
            message: `Reporte ${filename} disponible para descarga.`,
            metadata: { url: publicUrl },
            channel_sent: (sched.channel === "in_app" || sched.channel === "both" ? ["in_app"] : [])
              .concat(sched.channel === "email" || sched.channel === "both" ? ["email"] : []),
          });

          if ((sched.channel === "email" || sched.channel === "both") && user?.email) {
            await sendEmail({
              to: [user.email],
              subject: `[FBA Manager] Reporte: ${sched.name}`,
              html: buildAlertEmailHtml({
                title: `Reporte generado: ${sched.name}`,
                message: `Tu reporte ${sched.template} está listo. Descárgalo desde la sección de alertas o usa el enlace directo: ${publicUrl}`,
                severity: "info",
              }),
            });
          }
        }

        const nextRun = calcNextRun(sched.frequency, new Date());

        await supabase
          .from("scheduled_reports")
          .update({
            last_sent_at: new Date().toISOString(),
            next_run_at: nextRun,
          })
          .eq("id", sched.id);

        generated.push({ id: sched.id, name: sched.name, template: sched.template });
      } catch (err) {
        await supabase.from("alert_history").insert({
          user_id: sched.user_id,
          rule_name: `Reporte programado: ${sched.name}`,
          entity: "inventory",
          condition_type: "low_stock",
          severity: "error",
          title: `Error generando reporte: ${sched.name}`,
          message: String(err),
          channel_sent: ["in_app"],
        });
      }
    }

    return NextResponse.json({
      message: "Report generation complete",
      generated: generated.length,
      schedules: generated,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
