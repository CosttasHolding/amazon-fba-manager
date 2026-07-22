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
import { toast } from "sonner";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PaginationControl } from "@/components/ui/pagination-control";
import { OrderFormModal } from "@/components/order-form-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

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
  { key: "draft", color: "bg-slate-500", border: "border-slate-500", text: "text-slate-400" },
  { key: "sent", color: "bg-blue-500", border: "border-blue-500", text: "text-blue-400" },
  { key: "confirmed", color: "bg-blue-600", border: "border-blue-600", text: "text-blue-500" },
  { key: "in_production", color: "bg-amber-500", border: "border-amber-500", text: "text-amber-400" },
  { key: "shipped", color: "bg-orange-500", border: "border-orange-500", text: "text-orange-400" },
  { key: "in_transit", color: "bg-orange-600", border: "border-orange-600", text: "text-orange-500" },
  { key: "customs", color: "bg-red-500", border: "border-red-500", text: "text-red-400" },
  { key: "delivered", color: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-400" },
  { key: "cancelled", color: "bg-slate-600", border: "border-slate-600", text: "text-slate-400" },
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
              {isCurrent && <div className="w-full h-full rounded-full animate-pulse bg-primary/10" />}
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
  const { locale } = useLocale();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) { const data = await res.json(); setOrders(data.data || []); }
    } catch { toast.error(t("common.error_loading_orders", locale)); }
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
    if (filterStatus !== "all") result = result.filter((o) => o.status === filterStatus);
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
      <PageHeader badge={t("badge.orders", locale)} title={t("orders.title", locale)} subtitle={t("orders.subtitle", locale).replace("{count}", String(orders.length))} breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.orders", locale) }]}>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 me-1.5" /> {t("orders.new_order", locale)}
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t("orders.kpi_active", locale)} value={String(activeOrders.length)} icon={ClipboardList} accentColor="cyan" animationDelay={0} />
        <KpiCard label={t("orders.kpi_total_value", locale)} value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} icon={DollarSign} accentColor="green" animationDelay={75} />
        <KpiCard label={t("orders.kpi_in_transit", locale)} value={String(orders.filter((o) => o.status === "in_transit").length)} icon={Truck} accentColor="amber" animationDelay={150} />
        <KpiCard label={t("orders.kpi_next_arrival", locale)} value={nextArrival ? new Date(nextArrival.estimated_arrival!).toLocaleDateString(locale === "en" ? "en-US" : "es-ES") : "—"} icon={Calendar} accentColor="purple" animationDelay={225} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label={t("orders.search_aria", locale)} placeholder={t("orders.search_placeholder", locale)} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="ps-9 bg-muted/50 border-border" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
            <SelectTrigger className="h-9 bg-muted/50 border-border text-sm w-[180px]">
              <SelectValue placeholder={t("common.all_statuses", locale)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all_statuses", locale)}</SelectItem>
              {STATUS_FLOW.map((s) => (
                <SelectItem key={s.key} value={s.key}>{t("orders.status." + s.key, locale)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List */}
      <DataTableWrapper title={t("orders.count", locale).replace("{count}", String(filtered.length))} icon={ClipboardList}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("orders.empty_title", locale)}
            subtitle={t("orders.empty_subtitle", locale)}
            action={{ label: t("orders.new_order", locale), onClick: () => setShowModal(true) }}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">{t("orders.table_po_supplier", locale)}</th>
                    <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">{t("orders.table_product", locale)}</th>
                    <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-4">{t("orders.table_quantity", locale)}</th>
                    <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-4">{t("orders.table_total", locale)}</th>
                    <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-4">{t("orders.table_status", locale)}</th>
                    <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4 hidden lg:table-cell">{t("orders.table_progress", locale)}</th>
                    <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">{t("orders.table_eta", locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((order) => {
                    const statusCfg = STATUS_FLOW.find((s) => s.key === order.status);
                    return (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                        <td className="p-4">
                          <p className="text-sm font-medium text-foreground">{order.po_number || `PO-${order.id.slice(0, 8)}`}</p>
                          <p className="text-xs text-muted-foreground">{order.suppliers?.name || t("common.no_supplier", locale)}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-foreground">{order.products?.name || "—"}</p>
                          {order.products?.sku && <p className="text-xs text-muted-foreground font-mono">{order.products.sku}</p>}
                        </td>
                        <td className="p-4 text-end font-display text-sm text-foreground">{order.quantity}</td>
                        <td className="p-4 text-end font-display font-semibold text-sm text-foreground">${order.total_cost?.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border",
                            statusCfg?.color?.replace("bg-", "bg-")?.replace("500", "500/10") || "bg-slate-500/10",
                            statusCfg?.border?.replace("500", "500/20") || "border-slate-500/20",
                            statusCfg?.color?.replace("bg-", "text-") || "text-slate-400"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg?.color || "bg-slate-400")} />
                            {t("orders.status." + order.status, locale)}
                          </span>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <TimelineProgress status={order.status} />
                        </td>
                        <td className="p-4 text-end hidden md:table-cell text-sm text-muted-foreground">
                          {order.estimated_arrival ? new Date(order.estimated_arrival).toLocaleDateString(locale === "en" ? "en-US" : "es-ES") : "—"}
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
                        <p className="text-xs text-muted-foreground">{order.suppliers?.name || t("common.no_supplier", locale)}</p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                        statusCfg?.color?.replace("bg-", "bg-").replace("500", "500/10") || "bg-slate-500/10",
                        statusCfg?.border?.replace("500", "500/20") || "border-slate-500/20",
                        statusCfg?.color?.replace("bg-", "text-") || "text-slate-400"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg?.color || "bg-slate-400")} />
                        {t("orders.status." + order.status, locale)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-1">{order.products?.name || t("common.dash", locale)} <span className="text-xs text-muted-foreground font-mono">{order.products?.sku}</span></p>
                    <div className="grid grid-cols-3 gap-2 text-center mt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("orders.mobile_quantity", locale)}</p>
                        <p className="font-bold text-sm text-foreground tabular-nums">{order.quantity}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("orders.mobile_total", locale)}</p>
                        <p className="font-bold text-sm text-foreground tabular-nums">${order.total_cost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("orders.mobile_arrival", locale)}</p>
                        <p className="font-bold text-sm text-muted-foreground tabular-nums">{order.estimated_arrival ? new Date(order.estimated_arrival).toLocaleDateString(locale === "en" ? "en-US" : "es-ES") : t("common.dash", locale)}</p>
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
