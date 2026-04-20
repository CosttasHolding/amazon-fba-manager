"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Save, Loader2, Package, DollarSign, Users, ShoppingCart, Info, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

var CATEGORIES = [
  "Electronics", "Toys", "Home", "Kitchen", "Health", "Beauty", "Sports", "Books", "Other",
];

var STATUSES = [
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Descontinuado" },
];

var productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  asin: z.string().optional(),
  sku: z.string().min(1, "El SKU es requerido"),
  category: z.string().default("Other"),
  status: z.string().default("active"),
  unitCost: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  fbaFee: z.coerce.number().min(0).default(0),
  referralFee: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  storageCost: z.coerce.number().min(0).default(0),
  prepCost: z.coerce.number().min(0).default(0),
  taxes: z.coerce.number().min(0).default(0),
  otherFees: z.coerce.number().min(0).default(0),
  weight: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  unitsPurchased: z.coerce.number().min(0).default(0),
});

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

var inputClass = "h-9 bg-muted/50 border-border text-sm";
var labelClass = "text-xs text-muted-foreground";
var sectionLabel = "flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3 mt-1";

export default function EditProductPage() {
  var router = useRouter();
  var params = useParams();
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [productName, setProductName] = useState("");
  var [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  var [selectedSupplier, setSelectedSupplier] = useState("");
  var [originalSupplier, setOriginalSupplier] = useState("");
  var [supplierData, setSupplierData] = useState({
    unit_cost: "",
    moq: "",
    lead_time_days: "",
  });

  var form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  var { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

  useEffect(function() {
    if (params.id) {
      fetchProduct();
      fetchSuppliers();
      fetchLinkedSuppliers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  var fetchProduct = async function() {
    try {
      var res = await fetch("/api/products/" + params.id);
      if (!res.ok) throw new Error("Error");
      var raw = await res.json();
      var d = raw.data ? raw.data : raw;
      setProductName(d.name || "Producto");
      reset({
        name: d.name || "",
        asin: d.asin || "",
        sku: d.sku || "",
        category: d.category || "Other",
        status: d.status || "active",
        unitCost: d.unit_cost ?? 0,
        salePrice: d.sale_price ?? 0,
        fbaFee: d.fba_fee ?? 0,
        referralFee: d.referral_fee ?? 0,
        shippingCost: d.shipping_cost ?? 0,
        storageCost: d.storage_fee_monthly ?? 0,
        prepCost: d.prep_cost ?? 0,
        taxes: d.taxes ?? 0,
        otherFees: d.other_fees ?? 0,
        weight: d.weight_kg ?? 0,
        notes: d.notes || "",
        unitsPurchased: d.units_purchased ?? 0,
      });
    } catch {
      toast.error("Error al cargar el producto");
      router.push("/products");
    } finally {
      setLoading(false);
    }
  };

  var fetchSuppliers = async function() {
    try {
      var res = await fetch("/api/suppliers");
      if (res.ok) {
        var raw = await res.json();
        setSuppliers(raw.data || raw || []);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  var fetchLinkedSuppliers = async function() {
    try {
      var res = await fetch("/api/products/" + params.id + "/suppliers");
      if (res.ok) {
        var raw = await res.json();
        var data: LinkedSupplier[] = Array.isArray(raw) ? raw : raw.data || [];
        var primary = data.find(function(s) { return s.is_primary; }) || data[0];
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
  };

  var handleSupplierChange = function(supplierId: string) {
    setSelectedSupplier(supplierId);
    if (supplierId === "none" || !supplierId) {
      setSupplierData({ unit_cost: "", moq: "", lead_time_days: "" });
      return;
    }
    var found = suppliers.find(function(s) { return s.id === supplierId; });
    if (found && supplierId !== originalSupplier) {
      setSupplierData({
        unit_cost: "",
        moq: found.min_order_qty ? String(found.min_order_qty) : "",
        lead_time_days: found.lead_time_days ? String(found.lead_time_days) : "",
      });
    }
  };

  var onSubmit = async function(data: ProductFormData) {
    setSaving(true);
    try {
      var res = await fetch("/api/products/" + params.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var err = await res.json();
        throw new Error(err.error || "Error al actualizar");
      }

      var eff = selectedSupplier === "none" ? "" : selectedSupplier;
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
      var message = error instanceof Error ? error.message : "Error al actualizar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  var statusVal = watch("status");
  var categoryVal = watch("category");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={function() { router.push("/products/" + params.id); }}>
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
              Informacion basica
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
                <Label className={labelClass}>Categoria</Label>
                <Select value={categoryVal} onValueChange={function(v) { setValue("category", v); }}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(function(c) { return <SelectItem key={c} value={c}>{c}</SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelClass}>Estado</Label>
                <Select value={statusVal} onValueChange={function(v) { setValue("status", v); }}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(function(s) { return <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>; })}
                  </SelectContent>
                </Select>
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
                <Input type="number" step="0.01" {...register("unitCost")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Precio venta ($)</Label>
                <Input type="number" step="0.01" {...register("salePrice")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Tarifa FBA ($)</Label>
                <Input type="number" step="0.01" {...register("fbaFee")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Referral fee ($)</Label>
                <Input type="number" step="0.01" {...register("referralFee")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Envio ($)</Label>
                <Input type="number" step="0.01" {...register("shippingCost")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Almacenamiento ($)</Label>
                <Input type="number" step="0.01" {...register("storageCost")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Prep ($)</Label>
                <Input type="number" step="0.01" {...register("prepCost")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Impuestos ($)</Label>
                <Input type="number" step="0.01" {...register("taxes")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Otros fees ($)</Label>
                <Input type="number" step="0.01" {...register("otherFees")} className={inputClass} />
              </div>
            </div>
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
                {suppliers.map(function(s) {
                  return <SelectItem key={s.id} value={s.id}>{s.name + (s.country ? " (" + s.country + ")" : "")}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            {selectedSupplier && selectedSupplier !== "none" && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className={labelClass}>Costo unit. ($)</Label>
                  <Input type="number" step="0.01" value={supplierData.unit_cost}
                    onChange={function(e) { setSupplierData(function(p) { return Object.assign({}, p, { unit_cost: e.target.value }); }); }}
                    placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <Label className={labelClass}>MOQ</Label>
                  <Input type="number" value={supplierData.moq}
                    onChange={function(e) { setSupplierData(function(p) { return Object.assign({}, p, { moq: e.target.value }); }); }}
                    placeholder="100" className={inputClass} />
                </div>
                <div>
                  <Label className={labelClass}>Lead time (dias)</Label>
                  <Input type="number" value={supplierData.lead_time_days}
                    onChange={function(e) { setSupplierData(function(p) { return Object.assign({}, p, { lead_time_days: e.target.value }); }); }}
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
                <Label className={labelClass}>Peso (kg)</Label>
                <Input type="number" step="0.01" {...register("weight")} className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Unidades compradas</Label>
                <Input type="number" {...register("unitsPurchased")} className={inputClass} />
              </div>
            </div>
            <div className="mt-3">
              <Label className={labelClass}>Notas</Label>
              <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={2} className={"bg-muted/50 border-border text-sm"} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border sticky bottom-0 bg-card">
            <button type="button"
              onClick={function() { router.push("/products/" + params.id); }}
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