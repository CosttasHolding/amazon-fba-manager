"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fbaShipmentSchema } from "@/validations/fba-shipment";
import type { z } from "zod";
import { t } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PaginationControl } from "@/components/ui/pagination-control";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
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

type ShipmentFormData = z.infer<typeof fbaShipmentSchema>;

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

function STATUS_LABELS(locale: Locale): Record<string, string> {
  return {
    working: t("shipments.status_working", locale),
    ready_to_ship: t("shipments.status_ready_to_ship", locale),
    shipped: t("shipments.status_shipped", locale),
    in_transit: t("shipments.status_in_transit", locale),
    delivered: t("shipments.status_delivered", locale),
    checked_in: t("shipments.status_checked_in", locale),
    receiving: t("shipments.status_receiving", locale),
    closed: t("shipments.status_closed", locale),
    cancelled: t("shipments.status_cancelled", locale),
  };
}

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

function SHIPPING_METHODS(locale: Locale) {
  return [
    { value: "small_parcel", label: t("shipments.method_small_parcel", locale) },
    { value: "ltl", label: t("shipments.method_ltl", locale) },
    { value: "ftl", label: t("shipments.method_ftl", locale) },
    { value: "air", label: t("shipments.method_air", locale) },
    { value: "sea", label: t("shipments.method_sea", locale) },
  ];
}

export default function ShipmentsPage() {
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;
  const modalRef = useRef<HTMLDivElement>(null);

  const statusLabels = useMemo(() => STATUS_LABELS(locale), [locale]);
  const shippingMethods = useMemo(() => SHIPPING_METHODS(locale), [locale]);

  const {
    register,
    handleSubmit: handleFormSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(fbaShipmentSchema),
    defaultValues: {
      shipment_name: "",
      destination_fulfillment_center: "",
      shipping_method: "small_parcel",
      carrier: "",
      tracking_number: "",
      box_count: 0,
      total_units: 0,
      ship_date: "",
      estimated_arrival: "",
      notes: "",
    },
  });

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
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ShipmentFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/fba-shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          box_count: data.box_count || 0,
          total_units: data.total_units || 0,
        }),
      });
      if (!res.ok) throw new Error("Error");
      const newShipment = await res.json();
      setShipments((p) => [newShipment, ...p]);
      setShowModal(false);
      reset({
        shipment_name: "", destination_fulfillment_center: "", shipping_method: "small_parcel",
        carrier: "", tracking_number: "", box_count: 0, total_units: 0,
        ship_date: "", estimated_arrival: "", notes: "",
      });
      toast.success(t("shipments.created", locale));
    } catch {
      toast.error(t("shipments.error_create", locale));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { setCurrentPage(1); }, [filter]);

  const filtered = useMemo(
    () => filter === "all" ? shipments : shipments.filter((s) => s.status === filter),
    [shipments, filter]
  );

  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage, ITEMS_PER_PAGE]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("badge.shipments", locale)}
        title={t("shipments.title", locale)}
        subtitle={t("shipments.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.shipments", locale) }]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["working", "shipped", "in_transit", "delivered"].map((status) => {
          const count = shipments.filter((s) => s.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "all" : status)}
              className={`rounded-xl border p-3 text-start transition-all ${filter === status ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{statusLabels[status]}</span>
              </div>
              <p className="text-xl font-display font-bold text-foreground">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> {t("shipments.new_shipment", locale)}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div ref={modalRef} className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{t("shipments.modal_title", locale)}</h3>
              <button onClick={() => setShowModal(false)} aria-label={t("accessibility.close_modal", locale)} className="p-1 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px]">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="shipment_name" className="text-xs text-muted-foreground">{t("shipments.shipment_name", locale)}</Label>
                  <Input id="shipment_name" {...register("shipment_name")} placeholder={t("shipments.shipment_name_placeholder", locale)} className="h-9 bg-muted/50 border-border text-sm" />
                  {errors.shipment_name && <p className="text-xs text-destructive mt-1">{errors.shipment_name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="destination_fulfillment_center" className="text-xs text-muted-foreground">{t("shipments.fulfillment_center", locale)}</Label>
                  <Input id="destination_fulfillment_center" {...register("destination_fulfillment_center")} placeholder={t("shipments.fc_placeholder", locale)} className="h-9 bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <Label htmlFor="shipping_method" className="text-xs text-muted-foreground">{t("shipments.shipping_method", locale)}</Label>
                  <Select defaultValue="small_parcel" onValueChange={(v) => setValue("shipping_method", v as ShipmentFormData["shipping_method"])}>
                    <SelectTrigger id="shipping_method" className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {shippingMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="carrier" className="text-xs text-muted-foreground">{t("shipments.carrier", locale)}</Label>
                  <Input id="carrier" {...register("carrier")} placeholder={t("shipments.carrier_placeholder", locale)} className="h-9 bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <Label htmlFor="tracking_number" className="text-xs text-muted-foreground">{t("shipments.tracking", locale)}</Label>
                  <Input id="tracking_number" {...register("tracking_number")} placeholder={t("shipments.tracking_placeholder", locale)} className="h-9 bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <Label htmlFor="box_count" className="text-xs text-muted-foreground">{t("shipments.boxes", locale)}</Label>
                  <Input id="box_count" type="number" {...register("box_count", { valueAsNumber: true })} placeholder="0" className="h-9 bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <Label htmlFor="total_units" className="text-xs text-muted-foreground">{t("shipments.units", locale)}</Label>
                  <Input id="total_units" type="number" {...register("total_units", { valueAsNumber: true })} placeholder="0" className="h-9 bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <Label htmlFor="ship_date" className="text-xs text-muted-foreground">{t("shipments.ship_date", locale)}</Label>
                  <Input id="ship_date" type="date" {...register("ship_date")} className="h-9 bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <Label htmlFor="estimated_arrival" className="text-xs text-muted-foreground">{t("shipments.estimated_arrival", locale)}</Label>
                  <Input id="estimated_arrival" type="date" {...register("estimated_arrival")} className="h-9 bg-muted/50 border-border text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">{t("shipments.cancel", locale)}</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {t("shipments.create", locale)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DataTableWrapper title={t("shipments.table_title", locale)} icon={Truck}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("shipments.name_header", locale)}</th>
                <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("shipments.status_header", locale)}</th>
                <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("shipments.destination_header", locale)}</th>
                <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("shipments.units_header", locale)}</th>
                <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("shipments.eta_header", locale)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedShipments.map((s) => {
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
                        <span className="text-xs text-muted-foreground">{statusLabels[s.status] || s.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <MapPin className="h-3 w-3" />
                        {s.destination_fulfillment_center || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end font-display text-foreground">{s.total_units}</td>
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
                    {t("shipments.empty", locale)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
