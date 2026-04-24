"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Save, Loader2, Package, DollarSign, Info, Users, Weight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { FeeCalculatorInline } from "@/components/fee-calculator-inline";
import { calcFBAFee, calcRefFee } from "@/lib/calculations";
import { MARKETPLACES, PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@/lib/constants";

type ProductFormData = z.infer<typeof productSchema>;

interface Supplier {
  id: string;
  name: string;
  platform: string;
  country: string;
}

const sectionClass = "rounded-2xl border border-border bg-card p-6 space-y-4";
const sectionTitleClass = "flex items-center gap-2 text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4";
const labelClass = "text-sm text-muted-foreground";
const errorClass = "text-xs text-destructive mt-1";
const inputClass = "bg-background border-border";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [supplierData, setSupplierData] = useState({
    unit_cost: "",
    moq: "",
    lead_time_days: "",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      status: "active",
      category: "Other",
      marketplace: "US",
      unitCost: 0,
      salePrice: 0,
      fbaFee: 0,
      referralFee: 0,
      shippingCost: 0,
      storageFeeMonthly: 0,
      prepCost: 0,
      taxes: 0,
      otherFees: 0,
      weightKg: null,
    },
  });

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

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.default_fba_fee) setValue("fbaFee", Number(data.default_fba_fee));
          if (data.default_referral_fee) setValue("referralFee", Number(data.default_referral_fee));
          if (data.default_shipping_cost) setValue("shippingCost", Number(data.default_shipping_cost));
          if (data.default_storage_cost) setValue("storageFeeMonthly", Number(data.default_storage_cost));
        }
      } catch (error) {
      } finally {
        setLoadingDefaults(false);
      }
    };

    const fetchSuppliers = async () => {
      try {
        const res = await fetch("/api/suppliers");
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data.data || data || []);
        }
      } catch (error) {
      }
    };

    fetchSuppliers();
    fetchDefaults();
  }, [setValue]);

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear producto");
      }

      const product = await res.json();
      const productId = product.id || product.data?.id;

      if (selectedSupplier && selectedSupplier !== "none" && productId) {
        try {
          await fetch(`/api/products/${productId}/suppliers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplier_id: selectedSupplier,
              unit_cost: parseFloat(supplierData.unit_cost) || 0,
              moq: parseInt(supplierData.moq) || null,
              lead_time_days: parseInt(supplierData.lead_time_days) || null,
              is_primary: true,
            }),
          });
        } catch (error) {
        }
      }

      toast.success("Producto creado correctamente");
      router.push(`/products/${productId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al crear el producto";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const status = watch("status");
  const category = watch("category");
  const marketplace = watch("marketplace");

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="NUEVO PRODUCTO"
        title="Crear Producto"
        subtitle="Agrega un nuevo producto para rastrear en Amazon FBA"
        breadcrumbs={[
          { label: "Productos", href: "/products" },
          { label: "Nuevo" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Info basica */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Package className="h-4 w-4 text-primary" />
            Informacion basica
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className={labelClass}>Nombre del producto *</Label>
              <Input {...register("name")} placeholder="Ej: Silicone Kitchen Utensil Set" className={inputClass} />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div>
              <Label className={labelClass}>ASIN</Label>
              <Input {...register("asin")} placeholder="B08XXXXXX" className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>SKU *</Label>
              <Input {...register("sku")} placeholder="SKU-001" className={inputClass} />
              {errors.sku && <p className={errorClass}>{errors.sku.message}</p>}
            </div>
            <div>
              <Label className={labelClass}>Categoria *</Label>
              <Select value={category || "Other"} onValueChange={(v) => setValue("category", v as ProductFormData["category"])}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Marketplace *</Label>
              <Select value={marketplace || "US"} onValueChange={(v) => setValue("marketplace", v as ProductFormData["marketplace"])}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARKETPLACES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Estado</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as ProductFormData["status"])}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>
                <span className="flex items-center gap-1"><Weight className="h-3 w-3" /> Peso (kg)</span>
              </Label>
              <Input type="number" step="0.01" {...register("weightKg", { valueAsNumber: true })} placeholder="0.00" className={inputClass} />
              <p className="text-[10px] text-muted-foreground mt-1">El FBA fee se calcula automaticamente segun el peso</p>
            </div>
          </div>
        </div>

        {/* Costos */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <DollarSign className="h-4 w-4 text-primary" />
            Costos y precios
            {loadingDefaults && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className={labelClass}>Costo compra ($) *</Label>
              <Input type="number" step="0.01" {...register("unitCost", { valueAsNumber: true })} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Precio venta ($) *</Label>
              <Input type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} className={inputClass} />
              <p className="text-[10px] text-muted-foreground mt-1">El referral fee (15%) se calcula automaticamente</p>
            </div>
            <div>
              <Label className={labelClass}>Tarifa FBA ($)</Label>
              <Input type="number" step="0.01" {...register("fbaFee", { valueAsNumber: true })} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Tarifa referral ($)</Label>
              <Input type="number" step="0.01" {...register("referralFee", { valueAsNumber: true })} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Costo envio ($)</Label>
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

          {/* Calculadora inline */}
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

        {/* Proveedor */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Users className="h-4 w-4 text-primary" />
            Proveedor (opcional)
          </div>
          <div>
            <Label className={labelClass}>Seleccionar proveedor</Label>
            <Select value={selectedSupplier || "none"} onValueChange={setSelectedSupplier}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Sin proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proveedor</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.platform ? `(${s.platform})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSupplier && selectedSupplier !== "none" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <Label className={labelClass}>Costo unitario ($)</Label>
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
                <Label className={labelClass}>Lead time (dias)</Label>
                <Input type="number" value={supplierData.lead_time_days}
                  onChange={(e) => setSupplierData((p) => ({ ...p, lead_time_days: e.target.value }))}
                  placeholder="30" className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {/* Detalles */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Info className="h-4 w-4 text-primary" />
            Detalles adicionales
          </div>
          <div>
            <Label className={labelClass}>Notas</Label>
            <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={3} className={inputClass} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="px-5 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Crear producto
          </button>
        </div>
      </form>
    </div>
  );
}
