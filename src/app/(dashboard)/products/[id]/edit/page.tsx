"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Save, Loader2, Package, DollarSign, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  "Electronics", "Toys", "Home", "Kitchen", "Health", "Beauty", "Sports", "Books", "Other",
] as const;

const STATUSES = [
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Descontinuado" },
] as const;

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  asin: z.string().optional(),
  sku: z.string().min(1, "El SKU es requerido"),
  category: z.enum(["Electronics", "Toys", "Home", "Kitchen", "Health", "Beauty", "Sports", "Books", "Other"]),
  status: z.enum(["active", "paused", "discontinued"]).default("active"),
  unitCost: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  fbaFee: z.coerce.number().min(0).default(0),
  referralFee: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  storageCost: z.coerce.number().min(0).default(0),
  weight: z.coerce.number().min(0).default(0),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  minStock: z.coerce.number().min(0).default(10),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Supplier {
  id: string;
  name: string;
  platform: string;
  country: string;
}

interface LinkedSupplier {
  id: string;
  unit_cost: number;
  moq: number;
  lead_time_days: number;
  is_primary: boolean;
  suppliers: { id: string; name: string };
}

const sectionClass = "rounded-2xl border border-border bg-card p-6 space-y-4";
const sectionTitleClass = "flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider mb-4";
const labelClass = "text-sm text-muted-foreground";
const errorClass = "text-xs text-destructive mt-1";
const inputClass = "bg-muted/50 border-border";

function EditSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [originalSupplier, setOriginalSupplier] = useState("");
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
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (params.id) {
      fetchProduct();
      fetchSuppliers();
      fetchLinkedSuppliers();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      if (!res.ok) throw new Error("Error");
      const d = await res.json();
      setProductName(d.name || "Producto");
      reset({
        name: d.name || "",
        asin: d.asin || "",
        sku: d.sku || "",
        category: d.category || "Other",
        status: d.status || "active",
        unitCost: d.unitCost ?? d.unit_cost ?? d.buy_cost ?? 0,
        salePrice: d.salePrice ?? d.sale_price ?? d.sell_price ?? 0,
        fbaFee: d.fbaFee ?? d.fba_fee ?? 0,
        referralFee: d.referralFee ?? d.referral_fee ?? 0,
        shippingCost: d.shippingCost ?? d.shipping_cost ?? 0,
        storageCost: d.storageCost ?? d.storage_cost ?? 0,
        weight: d.weight ?? 0,
        dimensions: d.dimensions || "",
        notes: d.notes || "",
        imageUrl: d.imageUrl ?? d.image_url ?? "",
        minStock: d.minStock ?? d.min_stock ?? 10,
      });
    } catch {
      toast.error("Error al cargar el producto");
      router.push("/products");
    } finally {
      setLoading(false);
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
      console.error("Error loading suppliers:", error);
    }
  };

  const fetchLinkedSuppliers = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}/suppliers`);
      if (res.ok) {
        const data: LinkedSupplier[] = await res.json();
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
  };

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${params.id}`, {
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
        await fetch(`/api/products/${params.id}/suppliers?supplier_id=${originalSupplier}`, { method: "DELETE" });
      }
      if (eff) {
        if (originalSupplier && originalSupplier !== eff) {
          await fetch(`/api/products/${params.id}/suppliers?supplier_id=${originalSupplier}`, { method: "DELETE" });
        }
        await fetch(`/api/products/${params.id}/suppliers`, {
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
      router.push(`/products/${params.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al actualizar el producto";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const status = watch("status");
  const category = watch("category");

  if (loading) {
    return <EditSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="EDITAR PRODUCTO"
        title={productName}
        subtitle="Modifica los datos del producto"
        breadcrumbs={[
          { label: "Productos", href: "/products" },
          { label: productName, href: `/products/${params.id}` },
          { label: "Editar" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información básica */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Package className="h-4 w-4 text-primary" />
            Información básica
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className={labelClass}>Nombre del producto *</Label>
              <Input {...register("name")} className={inputClass} />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div>
              <Label className={labelClass}>ASIN</Label>
              <Input {...register("asin")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>SKU *</Label>
              <Input {...register("sku")} className={inputClass} />
              {errors.sku && <p className={errorClass}>{errors.sku.message}</p>}
            </div>
            <div>
              <Label className={labelClass}>Categoría *</Label>
              <Select value={category} onValueChange={(v) => setValue("category", v as ProductFormData["category"])}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Estado</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as ProductFormData["status"])}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Costos y precios */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <DollarSign className="h-4 w-4 text-primary" />
            Costos y precios
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className={labelClass}>Costo compra ($) *</Label>
              <Input type="number" step="0.01" {...register("unitCost")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Precio venta ($) *</Label>
              <Input type="number" step="0.01" {...register("salePrice")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Tarifa FBA ($)</Label>
              <Input type="number" step="0.01" {...register("fbaFee")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Tarifa referral ($)</Label>
              <Input type="number" step="0.01" {...register("referralFee")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Costo envío ($)</Label>
              <Input type="number" step="0.01" {...register("shippingCost")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Almacenamiento ($)</Label>
              <Input type="number" step="0.01" {...register("storageCost")} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Proveedor */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Users className="h-4 w-4 text-primary" />
            Proveedor
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
                <Label className={labelClass}>Lead time (días)</Label>
                <Input type="number" value={supplierData.lead_time_days}
                  onChange={(e) => setSupplierData((p) => ({ ...p, lead_time_days: e.target.value }))}
                  placeholder="30" className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {/* Detalles adicionales */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Info className="h-4 w-4 text-primary" />
            Detalles adicionales
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className={labelClass}>Peso (kg)</Label>
              <Input type="number" step="0.01" {...register("weight")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Dimensiones</Label>
              <Input {...register("dimensions")} placeholder="30x20x10 cm" className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Stock mínimo</Label>
              <Input type="number" {...register("minStock")} className={inputClass} />
            </div>
          </div>
          <div>
            <Label className={labelClass}>URL de imagen</Label>
            <Input {...register("imageUrl")} placeholder="https://..." className={inputClass} />
          </div>
          <div>
            <Label className={labelClass}>Notas</Label>
            <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={3} className={inputClass} />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/products/${params.id}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}