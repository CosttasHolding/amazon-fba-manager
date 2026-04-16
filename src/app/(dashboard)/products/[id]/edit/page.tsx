"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ArrowLeft, Save, Loader2, Package, DollarSign, Info, Users } from "lucide-react";
import { toast } from "sonner";

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
  category: z.enum(["Electronics","Toys","Home","Kitchen","Health","Beauty","Sports","Books","Other"]),
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

type ProductForm = z.infer<typeof productSchema>;

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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

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
    } catch (error) {
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

  const onSubmit = async (data: ProductForm) => {
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
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar el producto");
    } finally {
      setSaving(false);
    }
  };

  const status = watch("status");
  const category = watch("category");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/products/${params.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Producto</h1>
          <p className="text-sm text-muted-foreground">Modifica los datos del producto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Informaci{"\u00F3"}n b{"\u00E1"}sica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Nombre del producto *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="asin">ASIN</Label>
                <Input id="asin" {...register("asin")} />
              </div>
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" {...register("sku")} />
                {errors.sku && <p className="text-sm text-red-500 mt-1">{errors.sku.message}</p>}
              </div>
              <div>
                <Label>Categor{"\u00ED"}a *</Label>
                <Select value={category} onValueChange={(v) => setValue("category", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={status} onValueChange={(v) => setValue("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Costos y precios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="unitCost">Costo compra ($) *</Label>
                <Input id="unitCost" type="number" step="0.01" {...register("unitCost")} />
              </div>
              <div>
                <Label htmlFor="salePrice">Precio venta ($) *</Label>
                <Input id="salePrice" type="number" step="0.01" {...register("salePrice")} />
              </div>
              <div>
                <Label htmlFor="fbaFee">Tarifa FBA ($)</Label>
                <Input id="fbaFee" type="number" step="0.01" {...register("fbaFee")} />
              </div>
              <div>
                <Label htmlFor="referralFee">Tarifa referral ($)</Label>
                <Input id="referralFee" type="number" step="0.01" {...register("referralFee")} />
              </div>
              <div>
                <Label htmlFor="shippingCost">Costo env{"\u00ED"}o ($)</Label>
                <Input id="shippingCost" type="number" step="0.01" {...register("shippingCost")} />
              </div>
              <div>
                <Label htmlFor="storageCost">Almacenamiento ($)</Label>
                <Input id="storageCost" type="number" step="0.01" {...register("storageCost")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Seleccionar proveedor</Label>
              <Select value={selectedSupplier || "none"} onValueChange={setSelectedSupplier}>
                <SelectTrigger><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                <div>
                  <Label>Costo unitario ($)</Label>
                  <Input type="number" step="0.01" value={supplierData.unit_cost}
                    onChange={(e) => setSupplierData((p) => ({ ...p, unit_cost: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div>
                  <Label>MOQ</Label>
                  <Input type="number" value={supplierData.moq}
                    onChange={(e) => setSupplierData((p) => ({ ...p, moq: e.target.value }))}
                    placeholder="100" />
                </div>
                <div>
                  <Label>Lead time (d{"\u00ED"}as)</Label>
                  <Input type="number" value={supplierData.lead_time_days}
                    onChange={(e) => setSupplierData((p) => ({ ...p, lead_time_days: e.target.value }))}
                    placeholder="30" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Detalles adicionales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" type="number" step="0.01" {...register("weight")} />
              </div>
              <div>
                <Label htmlFor="dimensions">Dimensiones</Label>
                <Input id="dimensions" {...register("dimensions")} placeholder="30x20x10 cm" />
              </div>
              <div>
                <Label htmlFor="minStock">Stock m{"\u00ED"}nimo</Label>
                <Input id="minStock" type="number" {...register("minStock")} />
              </div>
            </div>
            <div>
              <Label htmlFor="imageUrl">URL de imagen</Label>
              <Input id="imageUrl" {...register("imageUrl")} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" {...register("notes")} placeholder="Notas adicionales..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.push(`/products/${params.id}`)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}