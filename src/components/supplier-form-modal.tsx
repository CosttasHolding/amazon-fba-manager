"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, SupplierFormData } from "@/validations/supplier";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SupplierFormModal({ onSuccess }: { onSuccess?: () => void }) {
    const router = useRouter();
    const form = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema),
        defaultValues: { status: "active" },
    });

    const onSubmit = async (data: SupplierFormData) => {
        try {
            const res = await fetch("/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Error al crear proveedor");
            toast.success("Proveedor creado");
            onSuccess?.();
            router.refresh();
        } catch (error) {
            toast.error("Error al guardar");
        }
    };

    return (
        <DialogContent className="max-w-2xl bg-[#0a0e1a] border-white/[0.08]">
            <DialogHeader>
                <DialogTitle className="text-cyan-400">Nuevo Proveedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-4 gap-4 py-4">
                <div className="col-span-2">
                    <Label className="text-xs text-cyan-400/80">Nombre</Label>
                    <Input {...form.register("name")} className="h-9 bg-white/[0.04] border-white/[0.08]" />
                </div>
                <div className="col-span-2">
                    <Label className="text-xs text-cyan-400/80">País</Label>
                    <Input {...form.register("country")} className="h-9 bg-white/[0.04] border-white/[0.08]" />
                </div>
                <div className="col-span-4">
                    <Label className="text-xs text-cyan-400/80 uppercase tracking-wider">Notas</Label>
                    <Textarea {...form.register("notes")} className="min-h-[120px] bg-white/[0.04] border-white/[0.08]" />
                </div>
                <div className="col-span-4 flex justify-end gap-2 mt-4">
                    <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white">Guardar Proveedor</Button>
                </div>
            </form>
        </DialogContent>
    );
}