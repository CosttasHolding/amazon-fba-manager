"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Loader2,
} from "lucide-react";
import { fmt } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  DataTableWrapper,
  tableHeaderClass,
  tableCellClass,
  tableRowClass,
} from "@/components/ui/data-table-wrapper";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sales")
      .then((r) => r.json())
      .then((d) => {
        setSales(d.data || []);
        setLoading(false);
      });
  }, []);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.sale_price || 0) * (s.units_sold || 0), 0);
  const totalUnits = sales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
  const totalFees = sales.reduce((sum, s) => sum + (s.amazon_fees || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <span className="text-sm text-white/40">Cargando ventas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <PageHeader
        badge="VENTAS"
        title="Ventas"
        subtitle="Historial de ventas de tus productos"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue Total"
          value={fmt(totalRevenue)}
          icon={DollarSign}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label="Profit Total"
          value={fmt(totalProfit)}
          icon={TrendingUp}
          accentColor="green"
          animationDelay={75}
          trend={totalProfit >= 0 ? "up" : "down"}
          trendValue={totalProfit >= 0 ? "Positivo" : "Negativo"}
        />
        <KpiCard
          label="Unidades"
          value={String(totalUnits)}
          icon={ShoppingCart}
          accentColor="amber"
          animationDelay={150}
        />
        <KpiCard
          label="Fees Amazon"
          value={fmt(totalFees)}
          icon={BarChart3}
          accentColor="red"
          animationDelay={225}
        />
      </div>

      {/* Empty */}
      {sales.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-white/15 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/70 mb-1">No hay ventas registradas</h3>
          <p className="text-sm text-white/35">Las ventas apareceran aqui cuando se registren</p>
        </div>
      )}

      {/* Table */}
      {sales.length > 0 && (
        <DataTableWrapper
          title={`${sales.length} venta${sales.length !== 1 ? "s" : ""}`}
        >
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Producto</th>
                  <th className={`${tableHeaderClass} text-center`}>Unidades</th>
                  <th className={`${tableHeaderClass} text-right`}>Revenue</th>
                  <th className={`${tableHeaderClass} text-right`}>Fees</th>
                  <th className={`${tableHeaderClass} text-right`}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className={tableRowClass}>
                    <td className={`${tableCellClass} text-white/40`}>
                      {new Date(s.sale_date).toLocaleDateString("es-ES")}
                    </td>
                    <td className={`${tableCellClass} font-medium text-white/80`}>
                      {s.products?.name || "N/A"}
                    </td>
                    <td className={`${tableCellClass} text-center text-white/60 tabular-nums`}>
                      {s.units_sold}
                    </td>
                    <td className={`${tableCellClass} text-right text-white/70 tabular-nums`}>
                      {fmt((s.sale_price || 0) * (s.units_sold || 0))}
                    </td>
                    <td className={`${tableCellClass} text-right text-red-400 tabular-nums`}>
                      {fmt(s.amazon_fees)}
                    </td>
                    <td className={`${tableCellClass} text-right font-semibold tabular-nums ${
                      (s.profit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {fmt(s.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3 p-4">
            {sales.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-white/80">
                      {s.products?.name || "N/A"}
                    </p>
                    <p className="text-xs text-white/30">
                      {new Date(s.sale_date).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <p className={`font-bold text-sm tabular-nums ${
                    (s.profit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {fmt(s.profit)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <p className="text-[10px] text-white/30">Unidades</p>
                    <p className="font-bold text-sm text-white/70 tabular-nums">{s.units_sold}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30">Revenue</p>
                    <p className="font-bold text-sm text-white/70 tabular-nums">
                      {fmt((s.sale_price || 0) * (s.units_sold || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30">Fees</p>
                    <p className="font-bold text-sm text-red-400 tabular-nums">{fmt(s.amazon_fees)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataTableWrapper>
      )}
    </div>
  );
}