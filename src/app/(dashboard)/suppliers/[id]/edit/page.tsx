"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { supplierSchema, SupplierFormData } from "@/validations/supplier";
import { Supplier } from "@/types";
import { PageHeader } from "@/components/ui/page-header";

const COUNTRIES = [
  "China", "India", "Vietnam", "Taiwan", "Corea del Sur",
  "Tailandia", "Turquia", "Bangladesh", "Indonesia", "Otro",
];

const sectionClass = "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4";
const sectionTitleClass = "flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wider mb-4";
const labelClass = "text-sm text-white/50";
const errorClass = "text-xs text-red-400 mt-1";
const inputClass = "bg-white/[0.04] border-white/[0.08]";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
  });

  useEffect(() => {
    if (params.id) fetchSupplier();
  }, [params.id]);

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}`);
      if (res.ok) {
        const data: Supplier = await res.json();
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
  };

  const onSubmit = async (data: SupplierFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar");
      }

      toast.success(`${data.name} se actualizo correctamente`);
      router.push(`/suppliers/${params.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al actualizar proveedor";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <span className="text-sm text-white/40">Cargando proveedor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="EDITAR PROVEEDOR"
        title="Editar Proveedor"
        subtitle="Modifica los datos del proveedor"
        breadcrumbs={[
          { label: "Proveedores", href: "/suppliers" },
          { label: "Editar" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Info basica */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Factory className="h-4 w-4 text-cyan-400" />
            Informacion del Proveedor
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className={labelClass}>Nombre del Proveedor *</Label>
              <Input {...register("name")} className={inputClass} />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div className="md:col-span-2">
              <Label className={labelClass}>URL Alibaba / 1688</Label>
              <Input {...register("alibaba_url")} className={inputClass} />
              {errors.alibaba_url && <p className={errorClass}>{errors.alibaba_url.message}</p>}
            </div>
            <div>
              <Label className={labelClass}>Pais</Label>
              <Select value={watch("country") || ""} onValueChange={(val) => setValue("country", val)}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar pais" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Estado</Label>
              <Select value={watch("status")} onValueChange={(val) => setValue("status", val as "active" | "inactive")}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Rating (1-5)</Label>
              <Select value={watch("rating")?.toString() || ""} onValueChange={(val) => setValue("rating", val ? parseInt(val) : null)}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Sin rating" /></SelectTrigger>
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
              <Label className={labelClass}>Terminos de Pago</Label>
              <Input {...register("payment_terms")} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Mail className="h-4 w-4 text-cyan-400" />
            Informacion de Contacto
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Nombre de Contacto</Label>
              <Input {...register("contact_name")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Email</Label>
              <Input type="email" {...register("contact_email")} className={inputClass} />
              {errors.contact_email && <p className={errorClass}>{errors.contact_email.message}</p>}
            </div>
            <div>
              <Label className={labelClass}>WhatsApp</Label>
              <Input {...register("contact_whatsapp")} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Produccion */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Package className="h-4 w-4 text-cyan-400" />
            Produccion y Logistica
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>MOQ (Minimo de Orden)</Label>
              <Input type="number" {...register("min_order_qty")} className={inputClass} />
              {errors.min_order_qty && <p className={errorClass}>{errors.min_order_qty.message}</p>}
            </div>
            <div>
              <Label className={labelClass}>Lead Time (dias)</Label>
              <Input type="number" {...register("lead_time_days")} className={inputClass} />
              {errors.lead_time_days && <p className={errorClass}>{errors.lead_time_days.message}</p>}
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <FileText className="h-4 w-4 text-cyan-400" />
            Notas
          </div>
          <Textarea {...register("notes")} rows={4} className={inputClass} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push(`/suppliers/${params.id}`)}
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
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}