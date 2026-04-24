"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  DollarSign,
  Truck,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PaginationControl } from "@/components/ui/pagination-control";
import { OrderFormModal } from "@/components/order-form-modal";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  po_number: string | null;
  status: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
  shipping_method: string | null;
  shipping_cost: number | null;
  order_date: string | null;
  estimated_arrival: string | null;
  suppliers: { name: string } | null;
  products: { name: string; sku: string } | null;
  created_at: string;
}

const STATUS_FLOW = [
  { key: "draft", label: "Borrador", color: "bg-slate-500", border: "border-slate-500", text: "text-slate-400" },
  { key: "sent", label: "Enviado", color: "bg-blue-500", border: "border-blue-500", text: "text-blue-400" },
  { key: "confirmed", label: "Confirmado", color: "bg-blue-600", border: "border-blue-600", text: "text-blue-500" },
  { key: "in_production", label: "Producci\u00F3n", color: "bg-amber-500", border: "border-amber-500", text: "text-amber-400" },
  { key: "shipped", label: "Embarcado", color: "bg-orange-500", border: "border-orange-500", text: "text-orange-400" },
  { key: "in_transit", label: "En Tr\u00E1nsito", color: "bg-orange-600", border: "border-orange-600", text: "text-orange-500" },
  { key: "customs", label: "Aduana", color: "bg-red-500", border: "border-red-500", text: "text-red-400" },
  { key: "delivered", label: "Entregado", color: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-400" },
  { key: "cancelled", label: "Cancelado", color: "bg-slate-600", border: "border-slate-600", text: "text-slate-400" },
];

const STATUS_INDEX: Record<string, number> = {};
STATUS_FLOW.forEach((s, i) => (STATUS_INDEX[s.key] = i));

function TimelineProgress({ status }: { status: string }) {
  const currentIdx = STATUS_INDEX[status] ?? 0;
  const isCancelled = status === "cancelled";
  const steps = isCancelled ? STATUS_FLOW.slice(0, 1) : STATUS_FLOW.slice(0, -1);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        const isActive = idx <= currentIdx && !isCancelled;
        const isCurrent = idx === currentIdx && !isCancelled;
        return (
          <div key={step.key} className="flex items-center">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              isActive ? step.color : "bg-muted/50"
            )}>
              {isCurrent && <div className="w-full h-full rounded-full animate-pulse bg-white/30" />}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn("w-3 h-0.5", idx < currentIdx ? step.color : "bg-muted/50")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) { const data = await res.json(); setOrders(data); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let result = orders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        (o.po_number?.toLowerCase().includes(q) ?? false) ||
        (o.suppliers?.name?.toLowerCase().includes(q) ?? false) ||
        (o.products?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterStatus) result = result.filter((o) => o.status === filterStatus);
    return result;
  }, [orders, search, filterStatus]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const totalValue = orders.reduce((s, o) => s + (o.total_cost || 0), 0);
  const nextArrival = orders
    .filter((o) => o.estimated_arrival && !["delivered", "cancelled"].includes(o.status))
    .sort((a, b) => new Date(a.estimated_arrival!).getTime() - new Date(b.estimated_arrival!).getTime())[0];

  if (loading) return <PageSkeleton kpiCount={3} rowCount={6} showSearch />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader badge="PEDIDOS" title="\u00D3rdenes de Compra" subtitle={`${orders.length} \u00F3rdenes registradas`}>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Nueva Orden
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="\u00D3rdenes Activas" value={String(activeOrders.length)} icon={ClipboardList} accentColor="cyan" animationDelay={0} />
        <KpiCard label="Valor Total" value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} icon={DollarSign} accentColor="green" animationDelay={75} />
        <KpiCard label="En Tr\u00E1nsito" value={String(orders.filter((o) => o.status === "in_transit").length)} icon={Truck} accentColor="amber" animationDelay={150} />
        <KpiCard label="Pr\u00F3xima Llegada" value={nextArrival ? new Date(nextArrival.estimated_arrival!).toLocaleDateString("es-ES") : "\u2014"} icon={Calendar} accentColor="purple" animationDelay={225} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Buscar \u00F3rdenes" placeholder="Buscar PO, proveedor, producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50 border-border" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
            <SelectTrigger className="h-9 bg-muted/50 border-border text-sm w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              {STATUS_FLOW.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List */}
      <DataTableWrapper title={`${filtered.length} \u00F3rdenes`} icon={ClipboardList}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No hay \u00F3rdenes registradas"
            subtitle="Crea tu primera orden de compra para empezar a rastrear"
            action={{ label: "Nueva Orden", onClick: () => setShowModal(true) }}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">PO / Proveedor</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Producto</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">Cantidad</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">Total</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">Estado</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden lg:table-cell">Progreso</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Llegada Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((order) => {
                    const statusCfg = STATUS_FLOW.find((s) => s.key === order.status);
                    return (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                        <td className="p-4">
                          <p className="text-sm font-medium text-foreground">{order.po_number || `PO-${order.id.slice(0, 8)}`}</p>
                          <p className="text-xs text-muted-foreground">{order.suppliers?.name || "Sin proveedor"}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-foreground">{order.products?.name || "\u2014"}</p>
                          {order.products?.sku && <p className="text-xs text-muted-foreground font-mono">{order.products.sku}</p>}
                        </td>
                        <td className="p-4 text-right font-display text-sm text-foreground">{order.quantity}</td>
                        <td className="p-4 text-right font-display font-semibold text-sm text-foreground">${order.total_cost?.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border",
                            statusCfg?.color?.replace("bg-", "bg-").replace("500", "500/10") || "bg-slate-500/10",
                            statusCfg?.border?.replace("500", "500/20") || "border-slate-500/20",
                            statusCfg?.color?.replace("bg-", "text-") || "text-slate-400"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg?.color || "bg-slate-400")} />
                            {statusCfg?.label}
                          </span>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <TimelineProgress status={order.status} />
                        </td>
                        <td className="p-4 text-right hidden md:table-cell text-sm text-muted-foreground">
                          {order.estimated_arrival ? new Date(order.estimated_arrival).toLocaleDateString("es-ES") : "\u2014"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {paginated.map((order) => {
                const statusCfg = STATUS_FLOW.find((s) => s.key === order.status);
                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{order.po_number || `PO-${order.id.slice(0, 8)}`}</p>
                        <p className="text-xs text-muted-foreground">{order.suppliers?.name || "Sin proveedor"}</p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                        statusCfg?.color?.replace("bg-", "bg-").replace("500", "500/10") || "bg-slate-500/10",
                        statusCfg?.border?.replace("500", "500/20") || "border-slate-500/20",
                        statusCfg?.color?.replace("bg-", "text-") || "text-slate-400"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg?.color || "bg-slate-400")} />
                        {statusCfg?.label}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-1">{order.products?.name || "\u2014"} <span className="text-xs text-muted-foreground font-mono">{order.products?.sku}</span></p>
                    <div className="grid grid-cols-3 gap-2 text-center mt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Cantidad</p>
                        <p className="font-bold text-sm text-foreground tabular-nums">{order.quantity}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className="font-bold text-sm text-foreground tabular-nums">${order.total_cost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Llegada</p>
                        <p className="font-bold text-sm text-muted-foreground tabular-nums">{order.estimated_arrival ? new Date(order.estimated_arrival).toLocaleDateString("es-ES") : "\u2014"}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <TimelineProgress status={order.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="p-4 border-t border-border">
            <PaginationControl
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              totalItems={filtered.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </DataTableWrapper>

      <OrderFormModal open={showModal} onOpenChange={setShowModal} onSuccess={fetchOrders} />
    </div>
  );
}
