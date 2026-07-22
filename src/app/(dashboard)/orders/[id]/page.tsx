"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Package,
  DollarSign,
  Truck,
  Calendar,
  CreditCard,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { CommentsSection } from "@/components/comments-section";

const STATUS_FLOW = [
  { key: "draft", label: "orders.status.draft", color: "bg-slate-500", text: "text-slate-400" },
  { key: "sent", label: "orders.status.sent", color: "bg-blue-500", text: "text-blue-400" },
  { key: "confirmed", label: "orders.status.confirmed", color: "bg-blue-600", text: "text-blue-500" },
  { key: "in_production", label: "orders.status.in_production", color: "bg-amber-500", text: "text-amber-400" },
  { key: "shipped", label: "orders.status.shipped", color: "bg-orange-500", text: "text-orange-400" },
  { key: "in_transit", label: "orders.status.in_transit", color: "bg-orange-600", text: "text-orange-500" },
  { key: "customs", label: "orders.status.customs", color: "bg-red-500", text: "text-red-400" },
  { key: "delivered", label: "orders.status.delivered", color: "bg-emerald-500", text: "text-emerald-400" },
];

interface OrderDetail {
  id: string;
  po_number: string | null;
  status: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
  exchange_rate: number;
  shipping_method: string | null;
  shipping_cost: number | null;
  customs_cost: number | null;
  prep_center_cost: number | null;
  order_date: string | null;
  production_deadline: string | null;
  ship_date: string | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  tracking_number: string | null;
  forwarder_name: string | null;
  amazon_shipment_id: string | null;
  payment_deposit: number | null;
  payment_balance: number | null;
  payment_deposit_date: string | null;
  payment_balance_date: string | null;
  notes: string | null;
  suppliers: { name: string; country: string | null; contact_name: string | null } | null;
  products: { name: string; sku: string } | null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useLocale();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const dateLocale = locale === "en" ? "en-US" : "es-ES";

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`);
        if (res.ok) { const data = await res.json(); setOrder(data); }
        else router.push("/orders");
      } catch { router.push("/orders"); }
      finally { setLoading(false); }
    };
    if (params.id) fetchOrder();
  }, [params.id, router]);

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === order?.status);
  const isCancelled = order?.status === "cancelled";

  if (loading) return <PageSkeleton kpiCount={2} rowCount={4} showSearch={false} />;
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{t("orders.detail_not_found", locale)}</p>
        <Button variant="outline" onClick={() => router.push("/orders")}>{t("orders.detail_back", locale)}</Button>
      </div>
    );
  }

  const landedCost = (order.total_cost || 0) + (order.shipping_cost || 0) + (order.customs_cost || 0) + (order.prep_center_cost || 0);
  const totalPaid = (order.payment_deposit || 0) + (order.payment_balance || 0);
  const totalPending = landedCost - totalPaid;

  const fmtD = (d: string | null) => d ? new Date(d).toLocaleDateString(dateLocale) : "—";

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("orders.detail_badge", locale)}
        title={order.po_number || `PO-${order.id.slice(0, 8)}`}
        subtitle={order.suppliers?.name || t("orders.detail_no_supplier", locale)}
        breadcrumbs={[{ label: t("orders.status_breadcrumb", locale), href: "/orders" }, { label: order.po_number || t("orders.detail_breadcrumb", locale) }]}
      >
        <Button variant="outline" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4 me-1.5" /> {t("orders.detail_back_button", locale)}
        </Button>
      </PageHeader>

      {/* Timeline */}
      <DataTableWrapper title={t("orders.detail_progress", locale)} icon={ClipboardList}>
        <div className="p-5">
          {isCancelled ? (
            <div className="text-center py-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-500/10 text-slate-400 text-sm border border-slate-500/20">
                <AlertTriangle className="h-4 w-4" /> {t("orders.detail_cancelled", locale)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between relative">
              <div className="absolute start-0 end-0 top-[11px] h-1 bg-muted/50 rounded-full" />
              <div
                className="absolute start-0 top-[11px] h-1 bg-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, ((currentIdx) / (STATUS_FLOW.length - 1)) * 100))}%` }}
              />
              {STATUS_FLOW.map((step, idx) => {
                const isActive = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                      isActive ? `${step.color} border-transparent` : "bg-card border-border",
                      isCurrent && "ring-2 ring-cyan-500/30"
                    )}>
                      {isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className={cn("text-[10px] font-medium text-center w-16", isActive ? step.text : "text-muted-foreground")}>{t(step.label, locale)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DataTableWrapper>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DataTableWrapper title={t("orders.detail_general", locale)} icon={Package}>
          <div className="p-5 space-y-3">
            <InfoRow label={t("orders.detail_product", locale)} value={order.products?.name || "—"} />
            <InfoRow label={t("orders.detail_sku_label", locale)} value={order.products?.sku || "—"} />
            <InfoRow label={t("orders.table_quantity", locale)} value={String(order.quantity)} />
            <InfoRow label={t("orders.detail_unit_cost", locale)} value={`$${(order.unit_cost ?? 0).toFixed(4)}`} />
            <InfoRow label={t("orders.detail_total_product", locale)} value={`$${(order.total_cost ?? 0).toFixed(2)}`} />
            <InfoRow label={t("orders.detail_currency", locale)} value={order.currency} />
            <InfoRow label={t("orders.detail_exchange_rate", locale)} value={String(order.exchange_rate)} />
          </div>
        </DataTableWrapper>

        <DataTableWrapper title={t("orders.detail_shipping", locale)} icon={Truck}>
          <div className="p-5 space-y-3">
            <InfoRow label={t("orders.detail_shipping_method", locale)} value={order.shipping_method?.toUpperCase() || "—"} />
            <InfoRow label={t("orders.detail_shipping_cost", locale)} value={order.shipping_cost ? `$${order.shipping_cost.toFixed(2)}` : "—"} />
            <InfoRow label={t("orders.detail_forwarder", locale)} value={order.forwarder_name || "—"} />
            <InfoRow label={t("orders.detail_tracking", locale)} value={order.tracking_number || "—"} />
            <InfoRow label={t("orders.detail_customs", locale)} value={order.customs_cost ? `$${order.customs_cost.toFixed(2)}` : "—"} />
            <InfoRow label={t("orders.detail_prep_center", locale)} value={order.prep_center_cost ? `$${order.prep_center_cost.toFixed(2)}` : "—"} />
            <InfoRow label={t("orders.detail_amazon_shipment", locale)} value={order.amazon_shipment_id || "—"} />
          </div>
        </DataTableWrapper>

        <DataTableWrapper title={t("orders.detail_dates", locale)} icon={Calendar}>
          <div className="p-5 space-y-3">
            <InfoRow label={t("orders.detail_order_date", locale)} value={fmtD(order.order_date)} />
            <InfoRow label={t("orders.detail_deadline", locale)} value={fmtD(order.production_deadline)} />
            <InfoRow label={t("orders.detail_ship_date", locale)} value={fmtD(order.ship_date)} />
            <InfoRow label={t("orders.detail_estimated_arrival", locale)} value={fmtD(order.estimated_arrival)} />
            <InfoRow label={t("orders.detail_actual_arrival", locale)} value={fmtD(order.actual_arrival)} />
          </div>
        </DataTableWrapper>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataTableWrapper title={t("orders.detail_landed_cost", locale)} icon={DollarSign}>
          <div className="p-5 space-y-3">
            <LandedRow label={t("orders.detail_landed_product", locale)} value={order.total_cost ?? 0} />
            <LandedRow label={t("orders.detail_landed_shipping", locale)} value={order.shipping_cost || 0} />
            <LandedRow label={t("orders.detail_landed_customs", locale)} value={order.customs_cost || 0} />
            <LandedRow label={t("orders.detail_landed_prep", locale)} value={order.prep_center_cost || 0} />
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">{t("orders.detail_landed_total", locale)}</span>
              <span className="font-display font-bold text-cyan-400">${landedCost.toFixed(2)}</span>
            </div>
          </div>
        </DataTableWrapper>

        <DataTableWrapper title={t("orders.detail_payments", locale)} icon={CreditCard}>
          <div className="p-5 space-y-3">
            <LandedRow label={t("orders.detail_payment_deposit", locale)} value={order.payment_deposit || 0} />
            {order.payment_deposit_date && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{t("orders.detail_deposit_date", locale)}</span>
                <span>{fmtD(order.payment_deposit_date)}</span>
              </div>
            )}
            <LandedRow label={t("orders.detail_payment_balance", locale)} value={order.payment_balance || 0} />
            {order.payment_balance_date && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{t("orders.detail_balance_date", locale)}</span>
                <span>{fmtD(order.payment_balance_date)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">{t("orders.detail_payment_total", locale)}</span>
              <span className="font-display font-bold text-emerald-400">${totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("orders.detail_payment_pending", locale)}</span>
              <span className={cn("font-display font-semibold", totalPending > 0 ? "text-amber-400" : "text-emerald-400")}>
                ${totalPending.toFixed(2)}
              </span>
            </div>
          </div>
        </DataTableWrapper>
      </div>

      {order.notes && (
        <DataTableWrapper title={t("orders.detail_notes", locale)} icon={MapPin}>
          <div className="p-5">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </div>
        </DataTableWrapper>
      )}

      <CommentsSection entity="order" entityId={String(params.id)} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function LandedRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display text-foreground">${value.toFixed(2)}</span>
    </div>
  );
}
