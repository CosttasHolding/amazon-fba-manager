"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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

interface ProductFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const sectionClass = "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4";
const sectionTitleClass = "flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wider mb-4";
const labelClass = "text-sm text-white/50";
const errorClass = "text-xs text-red-400 mt-1";

export function ProductFormModal({ open, onOpenChange, onSuccess }: ProductFormModalProps) {
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
        reset,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            status: "active",
            category: "Other",
            unitCost: 0,
            salePrice: 0,
            fbaFee: 0,
            referralFee: 0,
            shippingCost: 0,
            storageCost: 0,
            weight: 0,
            minStock: 10,
        },
    });

    useEffect(() => {
        if (open) {
            reset();
            setSelectedSupplier("");
            setSupplierData({ unit_cost: "", moq: "", lead_time_days: "" });
            fetchSuppliers();
            fetchDefaults();
        }
    }, [open, reset]);

    const fetchDefaults = async () => {
        setLoadingDefaults(true);
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                if (data.default_fba_fee) setValue("fbaFee", Number(data.default_fba_fee));
                if (data.default_referral_fee) setValue("referralFee", Number(data.default_referral_fee));
                if (data.default_shipping_cost) setValue("shippingCost", Number(data.default_shipping_cost));
                if (data.default_storage_cost) setValue("storageCost", Number(data.default_storage_cost));
            }
        } catch (error) {
            console.error("Error loading defaults:", error);
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
            console.error("Error loading suppliers:", error);
        }
    };

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
                    console.error("Error linking supplier:", error);
                }
            }

            toast.success("Producto creado correctamente");
            onOpenChange(false);
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error al crear el producto";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const status = watch("status");
    const category = watch("category");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0e1a] border-white/[0.08]">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg font-semibold">
                        Alta de Producto
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Info basica */}
                    <div className={sectionClass}>
                        <div className={sectionTitleClass}>
                            <Package className="h-4 w-4 text-cyan-400" />
                            Informacion basica
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label className={labelClass}>Nombre del producto *</Label>
                                <Input {...register("name")} placeholder="Ej: Silicone Kitchen Utensil Set" className="bg-white/[0.04] border-white/[0.08]" />
                                {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                            </div>
                            <div>
                                <Label className={labelClass}>ASIN</Label>
                                <Input {...register("asin")} placeholder="B08XXXXXX" className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>SKU *</Label>
                                <Input {...register("sku")} placeholder="SKU-001" className="bg-white/[0.04] border-white/[0.08]" />
                                {errors.sku && <p className={errorClass}>{errors.sku.message}</p>}
                            </div>
                            <div>
                                <Label className={labelClass}>Categoria *</Label>
                                <Select value={category} onValueChange={(v) => setValue("category", v as ProductFormData["category"])}>
                                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08]"><SelectValue /></SelectTrigger>
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
                                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Costos */}
                    <div className={sectionClass}>
                        <div className={sectionTitleClass}>
                            <DollarSign className="h-4 w-4 text-cyan-400" />
                            Costos y precios
                            {loadingDefaults && <Loader2 className="h-3 w-3 animate-spin text-white/30" />}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <Label className={labelClass}>Costo compra ($) *</Label>
                                <Input type="number" step="0.01" {...register("unitCost")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>Precio venta ($) *</Label>
                                <Input type="number" step="0.01" {...register("salePrice")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>Tarifa FBA ($)</Label>
                                <Input type="number" step="0.01" {...register("fbaFee")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>Tarifa referral ($)</Label>
                                <Input type="number" step="0.01" {...register("referralFee")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>Costo envio ($)</Label>
                                <Input type="number" step="0.01" {...register("shippingCost")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>Almacenamiento ($)</Label>
                                <Input type="number" step="0.01" {...register("storageCost")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                        </div>
                    </div>

                    {/* Proveedor */}
                    <div className={sectionClass}>
                        <div className={sectionTitleClass}>
                            <Users className="h-4 w-4 text-cyan-400" />
                            Proveedor (opcional)
                        </div>
                        <div>
                            <Label className={labelClass}>Seleccionar proveedor</Label>
                            <Select value={selectedSupplier || "none"} onValueChange={setSelectedSupplier}>
                                <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
                                <div>
                                    <Label className={labelClass}>Costo unitario ($)</Label>
                                    <Input type="number" step="0.01" value={supplierData.unit_cost}
                                        onChange={(e) => setSupplierData((p) => ({ ...p, unit_cost: e.target.value }))}
                                        placeholder="0.00" className="bg-white/[0.04] border-white/[0.08]" />
                                </div>
                                <div>
                                    <Label className={labelClass}>MOQ</Label>
                                    <Input type="number" value={supplierData.moq}
                                        onChange={(e) => setSupplierData((p) => ({ ...p, moq: e.target.value }))}
                                        placeholder="100" className="bg-white/[0.04] border-white/[0.08]" />
                                </div>
                                <div>
                                    <Label className={labelClass}>Lead time (dias)</Label>
                                    <Input type="number" value={supplierData.lead_time_days}
                                        onChange={(e) => setSupplierData((p) => ({ ...p, lead_time_days: e.target.value }))}
                                        placeholder="30" className="bg-white/[0.04] border-white/[0.08]" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detalles */}
                    <div className={sectionClass}>
                        <div className={sectionTitleClass}>
                            <Info className="h-4 w-4 text-cyan-400" />
                            Detalles adicionales
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label className={labelClass}>Peso (kg)</Label>
                                <Input type="number" step="0.01" {...register("weight")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>Dimensiones</Label>
                                <Input {...register("dimensions")} placeholder="30x20x10 cm" className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                            <div>
                                <Label className={labelClass}>Stock minimo</Label>
                                <Input type="number" {...register("minStock")} className="bg-white/[0.04] border-white/[0.08]" />
                            </div>
                        </div>
                        <div>
                            <Label className={labelClass}>URL de imagen</Label>
                            <Input {...register("imageUrl")} placeholder="https://..." className="bg-white/[0.04] border-white/[0.08]" />
                        </div>
                        <div>
                            <Label className={labelClass}>Notas</Label>
                            <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={3} className="bg-white/[0.04] border-white/[0.08]" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 justify-end pt-2 border-t border-white/[0.06]">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:text-white/70 hover:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? "Guardando..." : "Crear producto"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}