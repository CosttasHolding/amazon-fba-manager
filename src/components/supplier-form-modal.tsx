"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, SupplierFormData } from "@/validations/supplier";
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
import { Loader2, Factory, Mail, Package, FileText } from "lucide-react";

const COUNTRIES = [
    "China", "India", "Vietnam", "Taiwan", "Corea del Sur",
    "Tailandia", "Turquía", "Bangladesh", "Indonesia", "Otro",
];

interface SupplierFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const inputClass = "h-9 bg-muted/50 border-border text-sm";
const labelClass = "text-xs text-muted-foreground";
const sectionLabel = "flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-2 mt-1";

export function SupplierFormModal({ open, onOpenChange, onSuccess }: SupplierFormModalProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const form = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: "",
            alibaba_url: "",
            contact_name: "",
            contact_email: "",
            contact_whatsapp: "",
            country: "",
            rating: null,
            payment_terms: "",
            min_order_qty: null,
            lead_time_days: null,
            notes: "",
            status: "active",
        },
    });

    const onSubmit = async (data: SupplierFormData) => {
        setSaving(true);
        try {
            const res = await fetch("/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear proveedor");
            }
            toast.success("Proveedor creado correctamente");
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
                        <Factory className="h-5 w-5 text-primary" />
                        Nuevo Proveedor
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[75vh] overflow-y-auto pr-1 space-y-4">
                    {/* Información del proveedor */}
                    <div>
                        <div className={sectionLabel}>
                            <Factory className="h-3 w-3" />
                            Información del proveedor
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <Label className={labelClass}>Nombre *</Label>
                                <Input {...form.register("name")} placeholder="Nombre del proveedor" className={inputClass} />
                                {form.formState.errors.name && (
                                    <p className="text-xs text-red-500 mt-0.5">{form.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div>
                                <Label className={labelClass}>País</Label>
                                <Select
                                    value={form.watch("country") || ""}
                                    onValueChange={(v) => form.setValue("country", v)}
                                >
                                    <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className={labelClass}>Estado</Label>
                                <Select
                                    value={form.watch("status")}
                                    onValueChange={(v) => form.setValue("status", v as "active" | "inactive")}
                                >
                                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="inactive">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-3">
                                <Label className={labelClass}>URL Alibaba / 1688</Label>
                                <Input {...form.register("alibaba_url")} placeholder="https://www.alibaba.com/..." className={inputClass} />
                                {form.formState.errors.alibaba_url && (
                                    <p className="text-xs text-red-500 mt-0.5">{form.formState.errors.alibaba_url.message}</p>
                                )}
                            </div>
                            <div>
                                <Label className={labelClass}>Rating (1-5)</Label>
                                <Select
                                    value={form.watch("rating")?.toString() || ""}
                                    onValueChange={(v) => form.setValue("rating", v ? parseInt(v) : null)}
                                >
                                    <SelectTrigger className={inputClass}><SelectValue placeholder="—" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">⭐ 1</SelectItem>
                                        <SelectItem value="2">⭐ 2</SelectItem>
                                        <SelectItem value="3">⭐ 3</SelectItem>
                                        <SelectItem value="4">⭐ 4</SelectItem>
                                        <SelectItem value="5">⭐ 5</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Contacto */}
                    <div>
                        <div className={sectionLabel}>
                            <Mail className="h-3 w-3" />
                            Contacto
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className={labelClass}>Nombre de contacto</Label>
                                <Input {...form.register("contact_name")} placeholder="John Doe" className={inputClass} />
                            </div>
                            <div>
                                <Label className={labelClass}>Email</Label>
                                <Input type="email" {...form.register("contact_email")} placeholder="email@example.com" className={inputClass} />
                                {form.formState.errors.contact_email && (
                                    <p className="text-xs text-red-500 mt-0.5">{form.formState.errors.contact_email.message}</p>
                                )}
                            </div>
                            <div>
                                <Label className={labelClass}>WhatsApp</Label>
                                <Input {...form.register("contact_whatsapp")} placeholder="+86 123 456 7890" className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* Producción y logística */}
                    <div>
                        <div className={sectionLabel}>
                            <Package className="h-3 w-3" />
                            Producción y logística
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className={labelClass}>MOQ (mínimo orden)</Label>
                                <Input
                                    type="number"
                                    {...form.register("min_order_qty")}
                                    placeholder="100"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Lead time (días)</Label>
                                <Input
                                    type="number"
                                    {...form.register("lead_time_days")}
                                    placeholder="30"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <Label className={labelClass}>Términos de pago</Label>
                                <Input {...form.register("payment_terms")} placeholder="T/T 30/70" className={inputClass} />
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
                            placeholder="Notas adicionales sobre el proveedor..."
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
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
                            {saving ? "Guardando..." : "Crear Proveedor"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}