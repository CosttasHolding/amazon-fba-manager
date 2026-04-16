"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supplierSchema, SupplierFormData } from "@/validations/supplier";

const COUNTRIES = [
    "China", "India", "Vietnam", "Taiwan", "Corea del Sur",
    "Tailandia", "Turquia", "Bangladesh", "Indonesia", "Otro",
];

interface SupplierFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const labelClass = "text-[11px] text-white/40 mb-0.5 block";
const errorClass = "text-[10px] text-red-400 mt-0.5";
const inputClass = "bg-white/[0.04] border-white/[0.08] h-8 text-sm";
const sectionLabel = "text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider";

export function SupplierFormModal({ open, onOpenChange, onSuccess }: SupplierFormModalProps) {
    const [saving, setSaving] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<SupplierFormData>({
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

    useEffect(() => {
        if (open) {
            reset();
        }
    }, [open, reset]);

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

            toast.success(`${data.name} se agregó correctamente`);
            onOpenChange(false);
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error al crear proveedor";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#0a0e1a] border-white/[0.08] p-0 gap-0">
                <DialogHeader className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
                    <DialogTitle className="text-white text-base font-semibold">
                        Alta de Proveedor
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">

                    {/* INFO DEL PROVEEDOR */}
                    <div className="space-y-2">
                        <p className={sectionLabel}>Información del proveedor</p>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <label className={labelClass}>Nombre *</label>
                                <Input {...register("name")} placeholder="Ej: Shenzhen Tech Co." className={inputClass} />
                                {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>País</label>
                                <Select value={watch("country") || ""} onValueChange={(val) => setValue("country", val)}>
                                    <SelectTrigger className={`${inputClass} w-full`}><SelectValue placeholder="País" /></SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClass}>Estado</label>
                                <Select value={watch("status")} onValueChange={(val) => setValue("status", val as "active" | "inactive")}>
                                    <SelectTrigger className={`${inputClass} w-full`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="inactive">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>URL Alibaba / 1688</label>
                                <Input {...register("alibaba_url")} placeholder="https://supplier.alibaba.com/..." className={inputClass} />
                                {errors.alibaba_url && <p className={errorClass}>{errors.alibaba_url.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Rating (1-5)</label>
                                <Select value={watch("rating")?.toString() || ""} onValueChange={(val) => setValue("rating", val ? parseInt(val) : null)}>
                                    <SelectTrigger className={`${inputClass} w-full`}><SelectValue placeholder="—" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClass}>Términos de pago</label>
                                <Input {...register("payment_terms")} placeholder="30/70" className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* CONTACTO */}
                    <div className="space-y-2">
                        <p className={sectionLabel}>Contacto</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>Nombre contacto</label>
                                <Input {...register("contact_name")} placeholder="Ej: Jack Wang" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Email</label>
                                <Input type="email" {...register("contact_email")} placeholder="email@example.com" className={inputClass} />
                                {errors.contact_email && <p className={errorClass}>{errors.contact_email.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>WhatsApp</label>
                                <Input {...register("contact_whatsapp")} placeholder="+86 138 0000 0000" className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* PRODUCCION + NOTAS */}
                    <div className="space-y-2">
                        <p className={sectionLabel}>Producción y notas</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>MOQ</label>
                                <Input type="number" {...register("min_order_qty")} placeholder="500" className={inputClass} />
                                {errors.min_order_qty && <p className={errorClass}>{errors.min_order_qty.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Lead time (días)</label>
                                <Input type="number" {...register("lead_time_days")} placeholder="30" className={inputClass} />
                                {errors.lead_time_days && <p className={errorClass}>{errors.lead_time_days.message}</p>}
                            </div>
                            <div className="row-span-2">
                                <label className={labelClass}>Notas</label>
                                <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={2} className="bg-white/[0.04] border-white/[0.08] text-sm resize-none h-[68px]" />
                            </div>
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
                            {saving ? "Guardando..." : "Crear Proveedor"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}