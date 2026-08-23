export const dynamic = "force-dynamic";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Package, TrendingUp, DollarSign, AlertTriangle, Activity } from "lucide-react";
import { ReactNode } from "react";
import { SharedDashboardChart } from "@/components/shared-dashboard-chart";

interface Props {
  params: Promise<{ token: string }>;
}

async function fetchSharedData(token: string) {
  const supabase = createServiceRoleClient();

  const { data: link, error: linkError } = await supabase
    .from("shared_links")
    .select("*")
    .eq("token", token)
    .eq("active", true)
    .not("org_id", "is", null)
    .single();

  if (linkError || !link) return null;
  if (!link.org_id) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  const { data: products } = await supabase
    .from("products_with_inventory")
    .select("*")
    .eq("user_id", link.user_id)
    .eq("org_id", link.org_id);

  const allProducts = products || [];
  const activeProducts = allProducts.filter((p) => p.status === "active");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  const currentMonthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(new Date(currentYear, currentMonth + 1, 0).getDate()).padStart(2, "0")}`;
  const lastMonthStart = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, "0")}-01`;
  const lastMonthEnd = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, "0")}-${String(new Date(lastMonthYear, lastMonth + 1, 0).getDate()).padStart(2, "0")}`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: allSales } = await supabase
    .from("sales")
    .select("sale_date, revenue, units_sold, product_id")
    .eq("user_id", link.user_id)
    .eq("org_id", link.org_id)
    .gte("sale_date", lastMonthStart)
    .order("sale_date", { ascending: true });

  const sales = allSales || [];
  const currentMonthSales = sales.filter((s) => s.sale_date >= currentMonthStart && s.sale_date <= currentMonthEnd);
  const lastMonthSales = sales.filter((s) => s.sale_date >= lastMonthStart && s.sale_date <= lastMonthEnd);

  const revenueCurrent = currentMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const revenueLast = lastMonthSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const unitsCurrent = currentMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
  const unitsLast = lastMonthSales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
  const alertCount = allProducts.filter((p) => p.stock_status === "low_stock" || p.stock_status === "out_of_stock").length;

  const topProducts = activeProducts
    .sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      sku: p.sku,
      net_profit: p.net_profit,
      roi: p.roi,
    }));

  const recentSales = sales.filter((s) => s.sale_date >= thirtyDaysAgoStr);
  const chartDataMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    chartDataMap[d.toISOString().split("T")[0]] = 0;
  }
  for (const s of recentSales) {
    if (chartDataMap[s.sale_date] !== undefined) {
      chartDataMap[s.sale_date] += s.revenue || 0;
    }
  }
  const chartData = Object.entries(chartDataMap).map(([date, revenue]) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
    revenue: Math.round(revenue * 100) / 100,
  }));

  return {
    title: link.title,
    revenueCurrent,
    revenueLast,
    revenueDelta: revenueLast > 0 ? Math.round(((revenueCurrent - revenueLast) / revenueLast) * 100 * 100) / 100 : 0,
    unitsCurrent,
    unitsLast,
    unitsDelta: unitsLast > 0 ? Math.round(((unitsCurrent - unitsLast) / unitsLast) * 100 * 100) / 100 : 0,
    productCount: activeProducts.length,
    alertCount,
    topProducts,
    chartData,
  };
}

function StatCard({ label, value, icon, delta }: { label: string; value: string; icon: ReactNode; delta?: { value: number; positive: boolean } }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      {delta && (
        <p className={`text-xs mt-1 ${delta.positive ? "text-green-500" : "text-red-500"}`}>
          {delta.positive ? "+" : ""}{delta.value}% vs mes anterior
        </p>
      )}
    </div>
  );
}

export default async function SharedDashboardPage({ params }: Props) {
  const { token } = await params;
  const data = await fetchSharedData(token);

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Dashboard Compartido
          </p>
          <h1 className="text-2xl font-display font-bold text-foreground">{data.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Actualizado al {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Revenue Mensual"
            value={`$${data.revenueCurrent.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-4 h-4" />}
            delta={{ value: data.revenueDelta, positive: data.revenueDelta >= 0 }}
          />
          <StatCard
            label="Unidades Vendidas"
            value={data.unitsCurrent.toLocaleString()}
            icon={<TrendingUp className="w-4 h-4" />}
            delta={{ value: data.unitsDelta, positive: data.unitsDelta >= 0 }}
          />
          <StatCard
            label="Productos Activos"
            value={data.productCount.toLocaleString()}
            icon={<Package className="w-4 h-4" />}
          />
          <StatCard
            label="Alertas de Stock"
            value={data.alertCount.toLocaleString()}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
        </div>

        {/* Revenue Trend Chart */}
        {data.chartData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Tendencia de Revenue (30 días)</h2>
            </div>
            <SharedDashboardChart data={data.chartData} />
          </div>
        )}

        {/* Top Products */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Top 5 Productos por Rentabilidad</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">#</th>
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">Producto</th>
                  <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-4">Ganancia</th>
                  <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-4">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={p.sku} className="border-b border-border/50">
                    <td className="p-4 text-sm text-muted-foreground font-mono">{i + 1}</td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                    </td>
                    <td className="p-4 text-end text-sm font-display text-foreground">
                      ${(p.net_profit || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-end">
                      <span className="text-sm font-display font-semibold text-green-500">
                        {(p.roi || 0).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          Generado con Amazon FBA Manager
        </p>
      </div>
    </div>
  );
}
