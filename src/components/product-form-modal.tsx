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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
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

const labelClass = "text-[11px] text-white/40 mb-0.5 block";
const errorClass = "text-[10px] text-red-400 mt-0.5";
const inputClass = "bg-white/[0.04] border-white/[0.08] h-8 text-sm";
const sectionLabel = "text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider";

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
            <DialogContent className="max-w-2xl bg-[#0a0e1a] border-white/[0.08] p-0 gap-0">
                <DialogHeader className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
                    <DialogTitle className="text-white text-base font-semibold">
                        Alta de Producto
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">

                    {/* INFO BASICA */}
                    <div className="space-y-2">
                        <p className={sectionLabel}>Información básica</p>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <label className={labelClass}>Nombre *</label>
                                <Input {...register("name")} placeholder="Nombre del producto" className={inputClass} />
                                {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>SKU *</label>
                                <Input {...register("sku")} placeholder="SKU-001" className={inputClass} />
                                {errors.sku && <p className={errorClass}>{errors.sku.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>ASIN</label>
                                <Input {...register("asin")} placeholder="B08XXXXXX" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Categoría</label>
                                <Select value={category} onValueChange={(v) => setValue("category", v as ProductFormData["category"])}>
                                    <SelectTrigger className={`${inputClass} w-full`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClass}>Estado</label>
                                <Select value={status} onValueChange={(v) => setValue("status", v as ProductFormData["status"])}>
                                    <SelectTrigger className={`${inputClass} w-full`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClass}>Peso (kg)</label>
                                <Input type="number" step="0.01" {...register("weight")} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Stock mínimo</label>
                                <Input type="number" {...register("minStock")} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* COSTOS Y PRECIOS */}
                    <div className="space-y-2">
                        <p className={sectionLabel}>Costos y precios</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>Costo compra ($) *</label>
                                <Input type="number" step="0.01" {...register("unitCost")} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Precio venta ($) *</label>
                                <Input type="number" step="0.01" {...register("salePrice")} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Tarifa FBA ($)</label>
                                <Input type="number" step="0.01" {...register("fbaFee")} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Tarifa referral ($)</label>
                                <Input type="number" step="0.01" {...register("referralFee")} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Costo envío ($)</label>
                                <Input type="number" step="0.01" {...register("shippingCost")} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Almacenamiento ($)</label>
                                <Input type="number" step="0.01" {...register("storageCost")} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* PROVEEDOR */}
                    <div className="space-y-2">
                        <p className={sectionLabel}>Proveedor (opcional)</p>
                        <div className="grid grid-cols-4 gap-3">
                            <div className={selectedSupplier && selectedSupplier !== "none" ? "" : "col-span-4"}>
                                <label className={labelClass}>Proveedor</label>
                                <Select value={selectedSupplier || "none"} onValueChange={setSelectedSupplier}>
                                    <SelectTrigger className={`${inputClass} w-full`}>
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
                                <>
                                    <div>
                                        <label className={labelClass}>Costo unit. ($)</label>
                                        <Input type="number" step="0.01" value={supplierData.unit_cost}
                                            onChange={(e) => setSupplierData((p) => ({ ...p, unit_cost: e.target.value }))}
                                            placeholder="0.00" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>MOQ</label>
                                        <Input type="number" value={supplierData.moq}
                                            onChange={(e) => setSupplierData((p) => ({ ...p, moq: e.target.value }))}
                                            placeholder="100" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Lead time (días)</label>
                                        <Input type="number" value={supplierData.lead_time_days}
                                            onChange={(e) => setSupplierData((p) => ({ ...p, lead_time_days: e.target.value }))}
                                            placeholder="30" className={inputClass} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white/70 hover:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {saving ? "Guardando..." : "Crear producto"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}