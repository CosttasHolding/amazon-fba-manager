"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2, Factory, Mail, Package, FileText } from "lucide-react";
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
import { toast } from "sonner";
import { supplierSchema, SupplierFormData } from "@/validations/supplier";
import { Supplier } from "@/types";

const COUNTRY_SUGGESTIONS = [
  "China", "India", "Vietnam", "Taiwan", "Corea del Sur",
  "Tailandia", "Bangladesh", "Indonesia", "Estados Unidos",
  "M\u00E9xico", "Colombia", "Argentina", "Brasil", "Otro",
];

const STAR_OPTIONS = [
  { value: "1", label: "\u2B50" },
  { value: "2", label: "\u2B50\u2B50" },
  { value: "3", label: "\u2B50\u2B50\u2B50" },
  { value: "4", label: "\u2B50\u2B50\u2B50\u2B50" },
  { value: "5", label: "\u2B50\u2B50\u2B50\u2B50\u2B50" },
];

const inputClass = "h-9 bg-muted/50 border-border text-sm";
const labelClass = "text-xs text-muted-foreground";
const sectionLabel = "flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3 mt-1";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierName, setSupplierName] = useState("");

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

  const fetchSupplier = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers/" + params.id);
      if (res.ok) {
        const raw = await res.json();
        const data: Supplier = raw.data ? raw.data : raw;
        setSupplierName(data.name || "Proveedor");
        reset({
          name: data.name,
          alibaba_url: data.alibaba_url || "",
          contact_name: data.contact_name || "",
          contact_email: data.contact_email || "",
          contact_whatsapp: data.contact_whatsapp || "",
          country: data.country || "",
          rating: data.rating,
          payment_terms: data.payment_terms || "",
          min_order_qty: data.min_order_qty,
          lead_time_days: data.lead_time_days,
          notes: data.notes || "",
          status: data.status,
        });
      } else {
        router.push("/suppliers");
      }
    } catch {
      router.push("/suppliers");
    } finally {
      setLoading(false);
    }
  }, [params.id, reset, router]);

  useEffect(() => {
    if (params.id) fetchSupplier();
  }, [params.id, fetchSupplier]);

  const onSubmit = async (data: SupplierFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/suppliers/" + params.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar");
      }
      toast.success("Proveedor actualizado correctamente");
      router.push("/suppliers/" + params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al actualizar proveedor";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => router.push("/suppliers/" + params.id)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border p-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            {"Editar: " + supplierName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-5">

          <div>
            <div className={sectionLabel}>
              <Factory className="h-3 w-3" />
              Informaci\u00F3n del proveedor
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className={labelClass}>Nombre *</Label>
                <Input {...register("name")} className={inputClass} />
                {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Pa\u00EDs</Label>
                <Input
                  {...register("country")}
                  placeholder="Ej: China, M\u00E9xico..."
                  list="country-suggestions-edit"
                  className={inputClass}
                />
                <datalist id="country-suggestions-edit">
                  {COUNTRY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <Label className={labelClass}>Estado</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as "active" | "inactive")}
                >
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className={labelClass}>URL Alibaba / 1688</Label>
                <Input {...register("alibaba_url")} placeholder="https://www.alibaba.com/..." className={inputClass} />
                {errors.alibaba_url && <p className="text-xs text-destructive mt-0.5">{errors.alibaba_url.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Rating</Label>
                <Select
                  value={watch("rating")?.toString() || ""}
                  onValueChange={(v) => setValue("rating", v ? parseInt(v) : null)}
                >
                  <SelectTrigger className={inputClass}><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {STAR_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <Mail className="h-3 w-3" />
              Contacto
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className={labelClass}>Persona de contacto</Label>
                <Input {...register("contact_name")} placeholder="Nombre" className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>Email</Label>
                <Input {...register("contact_email")} placeholder="email@example.com" className={inputClass} />
                {errors.contact_email && <p className="text-xs text-destructive mt-0.5">{errors.contact_email.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>WhatsApp</Label>
                <Input {...register("contact_whatsapp")} placeholder="+86..." className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <Package className="h-3 w-3" />
              Condiciones comerciales
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className={labelClass}>T\u00E9rminos de pago</Label>
                <Input {...register("payment_terms")} placeholder="30/70, T/T..." className={inputClass} />
              </div>
              <div>
                <Label className={labelClass}>MOQ</Label>
                <Input type="number" {...register("min_order_qty", { valueAsNumber: true })} placeholder="100" className={inputClass} />
                {errors.min_order_qty && <p className="text-xs text-destructive mt-0.5">{errors.min_order_qty.message}</p>}
              </div>
              <div>
                <Label className={labelClass}>Lead time (d\u00EDas)</Label>
                <Input type="number" {...register("lead_time_days", { valueAsNumber: true })} placeholder="30" className={inputClass} />
                {errors.lead_time_days && <p className="text-xs text-destructive mt-0.5">{errors.lead_time_days.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <FileText className="h-3 w-3" />
              Notas
            </div>
            <Textarea {...register("notes")} placeholder="Notas adicionales..." rows={2} className="bg-muted/50 border-border text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border sticky bottom-0 bg-card">
            <button type="button"
              onClick={() => router.push("/suppliers/" + params.id)}
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
