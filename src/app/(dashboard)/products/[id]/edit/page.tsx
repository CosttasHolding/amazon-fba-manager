"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/validations/product";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Loader2, Package, DollarSign, Users, Info, Weight } from "lucide-react";
import { toast } from "sonner";
import { FeeCalculatorInline } from "@/components/fee-calculator-inline";
import { calcFBAFee, calcRefFee } from "@/lib/calculations";

const CATEGORIES = [
  "Electronics", "Toys", "Home", "Kitchen", "Health", "Beauty", "Sports", "Books", "Other",
];

const STATUSES = [
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Descontinuado" },
];

const MARKETPLACES = [
  { value: "US", label: "US" },
  { value: "MX", label: "MX" },
  { value: "CA", label: "CA" },
  { value: "UK", label: "UK" },
  { value: "DE", label: "DE" },
  { value: "FR", label: "FR" },
  { value: "IT", label: "IT" },
  { value: "ES", label: "ES" },
];

type ProductFormData = z.infer<typeof productSchema>;

interface SupplierOption {
  id: string;
  name: string;
  country: string;
  min_order_qty: number | null;
  lead_time_days: number | null;
}

interface LinkedSupplier {
  id: string;
  unit_cost: number;
  moq: number;
  lead_time_days: number;
  is_primary: boolean;
  suppliers: { id: string; name: string };
}

const inputClass = "h-9 bg-muted/50 border-border text-sm";
const labelClass = "text-xs text-muted-foreground";
const sectionLabel = "flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3 mt-1";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [originalSupplier, setOriginalSupplier] = useState("");
  const [supplierData, setSupplierData] = useState({
    unit_cost: "",
    moq: "",
    lead_time_days: "",
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;
  const watched = watch();

  // Auto-calculate FBA fee when weight changes
  useEffect(() => {
    const w = watched.weightKg;
    if (w && w > 0) {
      const fee = calcFBAFee(w);
      setValue("fbaFee", Number(fee.toFixed(2)));
    }
  }, [watched.weightKg, setValue]);

  // Auto-calculate referral fee when salePrice changes
  useEffect(() => {
    const sp = watched.salePrice;
    if (sp && sp > 0) {
      const fee = calcRefFee(sp);
      setValue("referralFee", Number(fee.toFixed(2)));
    }
  }, [watched.salePrice, setValue]);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch("/api/products/" + params.id);
      if (!res.ok) throw new Error("Error");
      const raw = await res.json();
      const d = raw.data ? raw.data : raw;
      setProductName(d.name || "Producto");
      reset({
        name: d.name || "",
        asin: d.asin || "",
        sku: d.sku || "",
        category: d.category || "Other",
        status: d.status || "active",
        marketplace: d.marketplace || "US",
        unitCost: d.unit_cost ?? 0,
        salePrice: d.sale_price ?? 0,
        fbaFee: d.fba_fee ?? 0,
        referralFee: d.referral_fee ?? 0,
        shippingCost: d.shipping_cost ?? 0,
        storageFeeMonthly: d.storage_fee_monthly ?? 0,
        prepCost: d.prep_cost ?? 0,
        taxes: d.taxes ?? 0,
        otherFees: d.other_fees ?? 0,
        weightKg: d.weight_kg ?? null,
        dimensions: d.dimensions || "",
        notes: d.notes || "",
        imageUrl: d.image_url || "",
        minStock: d.min_stock ?? 10,
      });
    } catch {
      toast.error("Error al cargar el producto");
      router.push("/products");
    } finally {
      setLoading(false);
    }
  }, [params.id, reset, router]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const raw = await res.json();
        setSuppliers(raw.data || raw || []);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  }, []);

  const fetchLinkedSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/products/" + params.id + "/suppliers");
      if (res.ok) {
        const raw = await res.json();
        const data: LinkedSupplier[] = Array.isArray(raw) ? raw : raw.data || [];
        const primary = data.find((s) => s.is_primary) || data[0];
        if (primary) {
          setSelectedSupplier(primary.suppliers.id);
          setOriginalSupplier(primary.suppliers.id);
          setSupplierData({
            unit_cost: primary.unit_cost ? String(primary.unit_cost) : "",
            moq: primary.moq ? String(primary.moq) : "",
            lead_time_days: primary.lead_time_days ? String(primary.lead_time_days) : "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading linked suppliers:", error);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
      fetchSuppliers();
      fetchLinkedSuppliers();
    }
  }, [params.id, fetchProduct, fetchSuppliers, fetchLinkedSuppliers]);

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    if (supplierId === "none" || !supplierId) {
      setSupplierData({ unit_cost: "", moq: "", lead_time_days: "" });
      return;
    }
    const found = suppliers.find((s) => s.id === supplierId);
    if (found && supplierId !== originalSupplier) {
      setSupplierData({
        unit_cost: "",
        moq: found.min_order_qty ? String(found.min_order_qty) : "",
        lead_time_days: found.lead_time_days ? String(found.lead_time_days) : "",
      });
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/products/" + params.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar");
      }

      const eff = selectedSupplier === "none" ? "" : selectedSupplier;
      if (originalSupplier && !eff) {
        await fetch("/api/products/" + params.id + "/suppliers?supplier_id=" + originalSupplier, { method: "DELETE" });
      }
      if (eff) {
        if (originalSupplier && originalSupplier !== eff) {
          await fetch("/api/products/" + params.id + "/suppliers?supplier_id=" + originalSupplier, { method: "DELETE" });
        }
        await fetch("/api/products/" + params.id + "/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: eff,
            unit_cost: parseFloat(supplierData.unit_cost) || 0,
            moq: parseInt(supplierData.moq) || null,
            lead_time_days: parseInt(supplierData.lead_time_days) || null,
            is_primary: true,
          }),
        });
      }

      toast.success("Producto actualizado correctamente");
      router.push("/products/" + params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al actualizar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const statusVal = watch("status");
  const categoryVal = watch("category");
  const marketplaceVal = watch("marketplace");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => router.push("/products/" + params.id)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border p-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {"Editar: " + productName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-5">

          <div>
            <div className={sectionLabel}>
              <Package className="h-3 w-3" />
              Informaci\u00F3n b\u00E1sica
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className={labelClass}>Nombre *</Label>
                <Input {...register("name")} className={inputClass} />
                {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>ASIN</Label>
                <Input {...register("asin")} placeholder="B0XXXXXXXX" className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>SKU *</Label>
                <Input {...register("sku")} className={inputClass} />
                {errors.sku && <p className="text-xs text-destructive mt-0.5">{errors.sku.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Categor\u00EDa</Label>
                <Select value={categoryVal || "Other"} onValueChange={(v) => setValue("category", v as ProductFormData["category"])}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelClass}>Marketplace</Label>
                <Select value={marketplaceVal || "US"} onValueChange={(v) => setValue("marketplace", v as ProductFormData["marketplace"])}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MARKETPLACES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelClass}>Estado</Label>
                <Select value={statusVal} onValueChange={(v) => setValue("status", v as ProductFormData["status"])}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelClass}>
                  <span className="flex items-center gap-1"><Weight className="h-3 w-3" /> Peso (kg)</span>
                </Label>
                <Input type="number" step="0.01" {...register("weightKg", { valueAsNumber: true })} className={inputClass} />
                <p className="text-[10px] text-muted-foreground mt-0.5">FBA fee se calcula automaticamente</p>
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <DollarSign className="h-3 w-3" />
              Costos y precios
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className={labelClass}>Costo unitario ($)</Label>
                <Input type="number" step="0.01" {...register("unitCost", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Precio venta ($)</Label>
                <Input type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Tarifa FBA ($)</Label>
                <Input type="number" step="0.01" {...register("fbaFee", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Referral fee ($)</Label>
                <Input type="number" step="0.01" {...register("referralFee", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Env\u00EDo ($)</Label>
                <Input type="number" step="0.01" {...register("shippingCost", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Almacenamiento/mes ($)</Label>
                <Input type="number" step="0.01" {...register("storageFeeMonthly", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Prep ($)</Label>
                <Input type="number" step="0.01" {...register("prepCost", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Impuestos ($)</Label>
                <Input type="number" step="0.01" {...register("taxes", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Otros fees ($)</Label>
                <Input type="number" step="0.01" {...register("otherFees", { valueAsNumber: true })} className={inputClass} />
              </div>
            </div>

            <FeeCalculatorInline
              unitCost={watched.unitCost || 0}
              shippingCost={watched.shippingCost || 0}
              prepCost={watched.prepCost || 0}
              taxes={watched.taxes || 0}
              salePrice={watched.salePrice || 0}
              weightKg={watched.weightKg || 0}
              storageFeeMonthly={watched.storageFeeMonthly || 0}
              otherFees={watched.otherFees || 0}
            />
          </div>

          <div>
            <div className={sectionLabel}>
              <Users className="h-3 w-3" />
              Proveedor
            </div>
            <Select value={selectedSupplier || "none"} onValueChange={handleSupplierChange}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Sin proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proveedor</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name + (s.country ? " (" + s.country + ")" : "")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSupplier && selectedSupplier !== "none" && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className={labelClass}>Costo unit. ($)</Label>
                  <Input type="number" step="0.01" value={supplierData.unit_cost}
                    onChange={(e) => setSupplierData((p) => ({ ...p, unit_cost: e.target.value }))}
                    placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <Label className={labelClass}>MOQ</Label>
                  <Input type="number" value={supplierData.moq}
                    onChange={(e) => setSupplierData((p) => ({ ...p, moq: e.target.value }))}
                    placeholder="100" className={inputClass} />
                </div>
                <div>
                  <Label className={labelClass}>Lead time (d\u00EDas)</Label>
                  <Input type="number" value={supplierData.lead_time_days}
                    onChange={(e) => setSupplierData((p) => ({ ...p, lead_time_days: e.target.value }))}
                    placeholder="30" className={inputClass} />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className={sectionLabel}>
              <Info className="h-3 w-3" />
              Detalles
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Dimensiones</Label>
                <Input {...register("dimensions")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Stock minimo</Label>
                <Input type="number" {...register("minStock", { valueAsNumber: true })} className={inputClass} />
              </div>
            </div>
            <div className="mt-3">
              <Label className={labelClass}>Notas</Label>
              <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={2} className="bg-muted/50 border-border text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border sticky bottom-0 bg-card">
            <button type="button"
              onClick={() => router.push("/products/" + params.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
