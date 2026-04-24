"use client";

import { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fmt } from "@/lib/utils";
import {
  Truck,
  Plus,
  Package,
  Ship,
  Plane,
  Box,
  Calendar,
  MapPin,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";

interface Shipment {
  id: string;
  shipment_name: string;
  shipment_id: string | null;
  status: string;
  shipping_method: string | null;
  carrier: string | null;
  destination_fulfillment_center: string | null;
  total_units: number;
  box_count: number;
  ship_date: string | null;
  estimated_arrival: string | null;
  created_at: string;
  purchase_orders: { po_number: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  working: "En preparación",
  ready_to_ship: "Listo para enviar",
  shipped: "Enviado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  checked_in: "Check-in",
  receiving: "Recibiendo",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  working: "bg-amber-500",
  ready_to_ship: "bg-blue-500",
  shipped: "bg-cyan-500",
  in_transit: "bg-indigo-500",
  delivered: "bg-green-500",
  checked_in: "bg-purple-500",
  receiving: "bg-emerald-500",
  closed: "bg-muted-foreground",
  cancelled: "bg-destructive",
};

const SHIPPING_ICONS: Record<string, React.ElementType> = {
  small_parcel: Box,
  ltl: Truck,
  ftl: Truck,
  air: Plane,
  sea: Ship,
};

export default function ShipmentsPage() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowModal(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showModal]);

  useEffect(() => {
    if (!showModal) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setShowModal(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModal]);
  const [form, setForm] = useState({
    shipment_name: "",
    destination_fulfillment_center: "",
    shipping_method: "small_parcel",
    carrier: "",
    tracking_number: "",
    box_count: "",
    total_units: "",
    ship_date: "",
    estimated_arrival: "",
    notes: "",
  });

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const res = await fetch("/api/fba-shipments");
      if (res.ok) {
        const json = await res.json();
        setShipments(json.data || json || []);
      }
    } catch (error) {
      console.error("Error cargando shipments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.shipment_name) { toast.error("Nombre del shipment requerido"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/fba-shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          box_count: parseInt(form.box_count) || 0,
          total_units: parseInt(form.total_units) || 0,
        }),
      });
      if (!res.ok) throw new Error("Error");
      const newShipment = await res.json();
      setShipments((p) => [newShipment, ...p]);
      setShowModal(false);
      setForm({
        shipment_name: "", destination_fulfillment_center: "", shipping_method: "small_parcel",
        carrier: "", tracking_number: "", box_count: "", total_units: "",
        ship_date: "", estimated_arrival: "", notes: "",
      });
      toast.success("Shipment creado");
    } catch {
      toast.error("Error al crear shipment");
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter === "all" ? shipments : shipments.filter((s) => s.status === filter);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="SHIPMENTS"
        title="Envíos FBA"
        subtitle="Gestión de inbound shipments a centros de fulfillment de Amazon"
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["working", "shipped", "in_transit", "delivered"].map((status) => {
          const count = shipments.filter((s) => s.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "all" : status)}
              className={`rounded-xl border p-3 text-left transition-all ${filter === status ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{STATUS_LABELS[status]}</span>
              </div>
              <p className="text-xl font-display font-bold text-foreground">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Nuevo Shipment Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo Shipment
        </button>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div ref={modalRef} className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Nuevo Shipment</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Nombre del shipment *</Label>
                <Input value={form.shipment_name} onChange={(e) => setForm((p) => ({ ...p, shipment_name: e.target.value }))} placeholder="Ej: Shipment Kitchen Set - Abril" className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fulfillment Center</Label>
                <Input value={form.destination_fulfillment_center} onChange={(e) => setForm((p) => ({ ...p, destination_fulfillment_center: e.target.value }))} placeholder="Ej: TPA1" className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Método de envío</Label>
                <Select value={form.shipping_method} onValueChange={(v) => setForm((p) => ({ ...p, shipping_method: v }))}>
                  <SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small_parcel">Small Parcel</SelectItem>
                    <SelectItem value="ltl">LTL</SelectItem>
                    <SelectItem value="ftl">FTL</SelectItem>
                    <SelectItem value="air">Aéreo</SelectItem>
                    <SelectItem value="sea">Marítimo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Carrier</Label>
                <Input value={form.carrier} onChange={(e) => setForm((p) => ({ ...p, carrier: e.target.value }))} placeholder="Ej: FedEx" className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tracking</Label>
                <Input value={form.tracking_number} onChange={(e) => setForm((p) => ({ ...p, tracking_number: e.target.value }))} placeholder="Número de tracking" className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cajas</Label>
                <Input type="number" value={form.box_count} onChange={(e) => setForm((p) => ({ ...p, box_count: e.target.value }))} placeholder="0" className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Unidades</Label>
                <Input type="number" value={form.total_units} onChange={(e) => setForm((p) => ({ ...p, total_units: e.target.value }))} placeholder="0" className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha de envío</Label>
                <Input type="date" value={form.ship_date} onChange={(e) => setForm((p) => ({ ...p, ship_date: e.target.value }))} className="h-9 bg-muted/50 border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Llegada estimada</Label>
                <Input type="date" value={form.estimated_arrival} onChange={(e) => setForm((p) => ({ ...p, estimated_arrival: e.target.value }))} className="h-9 bg-muted/50 border-border text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear Shipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipments table */}
      <DataTableWrapper title="Shipments" icon={Truck}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destino</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unidades</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((s) => {
                const Icon = s.shipping_method ? SHIPPING_ICONS[s.shipping_method] || Truck : Truck;
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/shipments/${s.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {s.shipment_name}
                      </Link>
                      {s.shipment_id && <p className="text-[10px] text-muted-foreground">{s.shipment_id}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s.status] || "bg-muted-foreground"}`} />
                        <span className="text-xs text-muted-foreground">{STATUS_LABELS[s.status] || s.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <MapPin className="h-3 w-3" />
                        {s.destination_fulfillment_center || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-foreground">{s.total_units}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s.estimated_arrival ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {s.estimated_arrival}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No hay shipments registrados. Crea uno usando el formulario de arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableWrapper>
    </div>
  );
}
