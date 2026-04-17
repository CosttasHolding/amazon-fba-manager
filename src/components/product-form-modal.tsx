"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/validations/product";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Package, DollarSign, Tag, FileText } from "lucide-react";

type ProductFormData = z.infer<typeof productSchema>;

const CATEGORIES = [
    "Electronics", "Toys", "Home", "Kitchen", "Health", "Beauty", "Sports", "Books", "Other",
] as const;

const MARKETPLACES = [
    { value: "US", label: "US" },
    { value: "MX", label: "MX" },
    { value: "CA", label: "CA" },
    { value: "UK", label: "UK" },
    { value: "DE", label: "DE" },
    { value: "FR", label: "FR" },
    { value: "IT", label: "IT" },
    { value: "ES", label: "ES" },
] as const;

const STATUSES = [
    { value: "active", label: "Activo" },
    { value: "paused", label: "Pausado" },
    { value: "discontinued", label: "Descontinuado" },
] as const;

interface ProductFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const inputClass = "h-9 bg-muted/50 border-border text-sm";
const labelClass = "text-xs text-muted-foreground";
const sectionLabel = "flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-2 mt-1";

export function ProductFormModal({ open, onOpenChange, onSuccess }: ProductFormModalProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const form = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            sku: "",
            asin: "",
            name: "",
            category: null,
            marketplace: "US",
            status: "active",
            unitCost: 0,
            shippingCost: 0,
            prepCost: 0,
            taxes: 0,
            salePrice: 0,
            referralFee: 0,
            fbaFee: 0,
            storageFeeMonthly: 0,
            otherFees: 0,
            weightKg: null,
            notes: "",
        },
    });

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
            toast.success("Producto creado correctamente");
            form.reset();
            onOpenChange(false);
            onSuccess?.();
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al guardar";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Nuevo Producto
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[75vh] overflow-y-auto pr-1 space-y-4">
                    {/* Información básica */}
                    <div>
                        <div className={sectionLabel}>
                            <Tag className="h-3 w-3" />
                            Información básica
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <Label className={labelClass}>Nombre *</Label>
                                <Input {...form.register("name")} placeholder="Nombre del producto" className={inputClass} />
                                {form.formState.errors.name && (
                                    <p className="text-xs text-red-500 mt-0.5">{form.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div>
                                <Label className={labelClass}>SKU *</Label>
                                <Input {...form.register("sku")} placeholder="SKU-001" className={inputClass} />
                                {form.formState.errors.sku && (
                                    <p className="text-xs text-red-500 mt-0.5">{form.formState.errors.sku.message}</p>
                                )}
                            </div>
                            <div>
                                <Label className={labelClass}>ASIN</Label>
                                <Input {...form.register("asin")} placeholder="B0XXXXXX" className={inputClass} />
                            </div>
                            <div>
                                <Label className={labelClass}>Categoría</Label>
                                <Select
                                    value={form.watch("category") || ""}
                                    onValueChange={(v) => form.setValue("category", v as ProductFormData["category"])}
                                >
                                    <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className={labelClass}>Marketplace</Label>
                                <Select
                                    value={form.watch("marketplace")}
                                    onValueChange={(v) => form.setValue("marketplace", v as ProductFormData["marketplace"])}
                                >
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
                                <Select
                                    value={form.watch("status")}
                                    onValueChange={(v) => form.setValue("status", v as ProductFormData["status"])}
                                >
                                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className={labelClass}>Peso (kg)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("weightKg", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Costos */}
                    <div>
                        <div className={sectionLabel}>
                            <DollarSign className="h-3 w-3" />
                            Costos
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <Label className={labelClass}>Costo unitario *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("unitCost", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Envío</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("shippingCost", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Prep</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("prepCost", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Impuestos</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("taxes", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Precio y tarifas */}
                    <div>
                        <div className={sectionLabel}>
                            <DollarSign className="h-3 w-3" />
                            Precio de venta y tarifas Amazon
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <Label className={labelClass}>Precio venta *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("salePrice", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Referral fee</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("referralFee", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>FBA fee</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("fbaFee", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Storage/mes</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("storageFeeMonthly", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Otros fees</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register("otherFees", { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notas */}
                    <div>
                        <div className={sectionLabel}>
                            <FileText className="h-3 w-3" />
                            Notas
                        </div>
                        <Textarea
                            {...form.register("notes")}
                            placeholder="Notas adicionales sobre el producto..."
                            className="min-h-[80px] bg-muted/50 border-border text-sm"
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-border sticky bottom-0 bg-card pb-1">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                            {saving ? "Guardando..." : "Crear Producto"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}