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

const STATUS_FLOW = [
  { key: "draft", label: "Borrador", color: "bg-slate-500", text: "text-slate-400" },
  { key: "sent", label: "Enviado", color: "bg-blue-500", text: "text-blue-400" },
  { key: "confirmed", label: "Confirmado", color: "bg-blue-600", text: "text-blue-500" },
  { key: "in_production", label: "Producción", color: "bg-amber-500", text: "text-amber-400" },
  { key: "shipped", label: "Embarcado", color: "bg-orange-500", text: "text-orange-400" },
  { key: "in_transit", label: "En Tránsito", color: "bg-orange-600", text: "text-orange-500" },
  { key: "customs", label: "Aduana", color: "bg-red-500", text: "text-red-400" },
  { key: "delivered", label: "Entregado", color: "bg-emerald-500", text: "text-emerald-400" },
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
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

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
        <p className="text-muted-foreground">Orden no encontrada</p>
        <Button variant="outline" onClick={() => router.push("/orders")}>Volver a pedidos</Button>
      </div>
    );
  }

  const landedCost = (order.total_cost || 0) + (order.shipping_cost || 0) + (order.customs_cost || 0) + (order.prep_center_cost || 0);
  const totalPaid = (order.payment_deposit || 0) + (order.payment_balance || 0);
  const totalPending = landedCost - totalPaid;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="ORDEN"
        title={order.po_number || `PO-${order.id.slice(0, 8)}`}
        subtitle={order.suppliers?.name || "Sin proveedor"}
        breadcrumbs={[{ label: "Pedidos", href: "/orders" }, { label: order.po_number || "Detalle" }]}
      >
        <Button variant="outline" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Volver
        </Button>
      </PageHeader>

      {/* Timeline */}
      <DataTableWrapper title="Progreso de la Orden" icon={ClipboardList}>
        <div className="p-5">
          {isCancelled ? (
            <div className="text-center py-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-500/10 text-slate-400 text-sm border border-slate-500/20">
                <AlertTriangle className="h-4 w-4" /> Orden cancelada
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between relative">
              {/* Progress bar background */}
              <div className="absolute left-0 right-0 top-[11px] h-1 bg-muted/50 rounded-full" />
              <div
                className="absolute left-0 top-[11px] h-1 bg-cyan-500 rounded-full transition-all duration-500"
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
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={cn("text-[10px] font-medium text-center w-16", isActive ? step.text : "text-muted-foreground")}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DataTableWrapper>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* General Info */}
        <DataTableWrapper title="Información General" icon={Package}>
          <div className="p-5 space-y-3">
            <InfoRow label="Producto" value={order.products?.name || "—"} />
            <InfoRow label="SKU" value={order.products?.sku || "—"} />
            <InfoRow label="Cantidad" value={String(order.quantity)} />
            <InfoRow label="Costo Unitario" value={`$${order.unit_cost.toFixed(4)}`} />
            <InfoRow label="Total Producto" value={`$${order.total_cost.toFixed(2)}`} />
            <InfoRow label="Moneda" value={order.currency} />
            <InfoRow label="Tipo de Cambio" value={String(order.exchange_rate)} />
          </div>
        </DataTableWrapper>

        {/* Shipping */}
        <DataTableWrapper title="Envío y Logística" icon={Truck}>
          <div className="p-5 space-y-3">
            <InfoRow label="Método" value={order.shipping_method?.toUpperCase() || "—"} />
            <InfoRow label="Costo Envío" value={order.shipping_cost ? `$${order.shipping_cost.toFixed(2)}` : "—"} />
            <InfoRow label="Forwarder" value={order.forwarder_name || "—"} />
            <InfoRow label="Tracking" value={order.tracking_number || "—"} />
            <InfoRow label="Aduana" value={order.customs_cost ? `$${order.customs_cost.toFixed(2)}` : "—"} />
            <InfoRow label="Prep Center" value={order.prep_center_cost ? `$${order.prep_center_cost.toFixed(2)}` : "—"} />
            <InfoRow label="Amazon Shipment" value={order.amazon_shipment_id || "—"} />
          </div>
        </DataTableWrapper>

        {/* Dates */}
        <DataTableWrapper title="Fechas" icon={Calendar}>
          <div className="p-5 space-y-3">
            <InfoRow label="Orden" value={order.order_date ? new Date(order.order_date).toLocaleDateString("es-ES") : "—"} />
            <InfoRow label="Deadline Producción" value={order.production_deadline ? new Date(order.production_deadline).toLocaleDateString("es-ES") : "—"} />
            <InfoRow label="Embarque" value={order.ship_date ? new Date(order.ship_date).toLocaleDateString("es-ES") : "—"} />
            <InfoRow label="Llegada Estimada" value={order.estimated_arrival ? new Date(order.estimated_arrival).toLocaleDateString("es-ES") : "—"} />
            <InfoRow label="Llegada Real" value={order.actual_arrival ? new Date(order.actual_arrival).toLocaleDateString("es-ES") : "—"} />
          </div>
        </DataTableWrapper>
      </div>

      {/* Costs & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataTableWrapper title="Costo Landed" icon={DollarSign}>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Producto</span>
              <span className="font-display text-foreground">${order.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span className="font-display text-foreground">${(order.shipping_cost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Aduana</span>
              <span className="font-display text-foreground">${(order.customs_cost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Prep Center</span>
              <span className="font-display text-foreground">${(order.prep_center_cost || 0).toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Costo Landed Total</span>
              <span className="font-display font-bold text-cyan-400">${landedCost.toFixed(2)}</span>
            </div>
          </div>
        </DataTableWrapper>

        <DataTableWrapper title="Pagos" icon={CreditCard}>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Depósito</span>
              <span className="font-display text-foreground">${(order.payment_deposit || 0).toFixed(2)}</span>
            </div>
            {order.payment_deposit_date && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Fecha depósito</span>
                <span>{new Date(order.payment_deposit_date).toLocaleDateString("es-ES")}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-display text-foreground">${(order.payment_balance || 0).toFixed(2)}</span>
            </div>
            {order.payment_balance_date && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Fecha balance</span>
                <span>{new Date(order.payment_balance_date).toLocaleDateString("es-ES")}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Total Pagado</span>
              <span className="font-display font-bold text-emerald-400">${totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pendiente</span>
              <span className={cn("font-display font-semibold", totalPending > 0 ? "text-amber-400" : "text-emerald-400")}>
                ${totalPending.toFixed(2)}
              </span>
            </div>
          </div>
        </DataTableWrapper>
      </div>

      {order.notes && (
        <DataTableWrapper title="Notas" icon={MapPin}>
          <div className="p-5">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </div>
        </DataTableWrapper>
      )}
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
