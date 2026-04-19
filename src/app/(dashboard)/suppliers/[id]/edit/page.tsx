"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";

const COUNTRIES = [
  "China",
  "India",
  "Vietnam",
  "Taiwan",
  "Corea del Sur",
  "Tailandia",
  "Turquía",
  "Bangladesh",
  "Indonesia",
  "Otro",
];

const sectionClass = "rounded-2xl border border-border bg-card p-6 space-y-4";
const sectionTitleClass =
  "flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider mb-4";
const labelClass = "text-sm text-muted-foreground";
const errorClass = "text-xs text-destructive mt-1";
const inputClass = "bg-muted/50 border-border";

function EditSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierName, setSupplierName] = useState("");

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

      toast.success(`${data.name} se actualizó correctamente`);
      router.push(`/suppliers/${params.id}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar proveedor";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EditSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="EDITAR PROVEEDOR"
        title={supplierName}
        subtitle="Modifica los datos del proveedor"
        breadcrumbs={[
          { label: "Proveedores", href: "/suppliers" },
          { label: supplierName, href: `/suppliers/${params.id}` },
          { label: "Editar" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Factory className="h-4 w-4 text-primary" />
            Información del Proveedor
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className={labelClass}>Nombre del Proveedor *</Label>
              <Input {...register("name")} className={inputClass} />
              {errors.name && (
                <p className={errorClass}>{errors.name.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label className={labelClass}>URL Alibaba / 1688</Label>
              <Input {...register("alibaba_url")} className={inputClass} />
              {errors.alibaba_url && (
                <p className={errorClass}>{errors.alibaba_url.message}</p>
              )}
            </div>
            <div>
              <Label className={labelClass}>País</Label>
              <Select
                value={watch("country") || ""}
                onValueChange={(val) => setValue("country", val)}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Estado</Label>
              <Select
                value={watch("status")}
                onValueChange={(val) =>
                  setValue("status", val as "active" | "inactive")
                }
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Rating (1-5)</Label>
              <Select
                value={watch("rating")?.toString() || ""}
                onValueChange={(val) =>
                  setValue("rating", val ? parseInt(val) : null)
                }
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Sin rating" />
                </SelectTrigger>
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
              <Label className={labelClass}>Términos de Pago</Label>
              <Input {...register("payment_terms")} className={inputClass} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Mail className="h-4 w-4 text-primary" />
            Información de Contacto
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Nombre de Contacto</Label>
              <Input {...register("contact_name")} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Email</Label>
              <Input
                type="email"
                {...register("contact_email")}
                className={inputClass}
              />
              {errors.contact_email && (
                <p className={errorClass}>{errors.contact_email.message}</p>
              )}
            </div>
            <div>
              <Label className={labelClass}>WhatsApp</Label>
              <Input {...register("contact_whatsapp")} className={inputClass} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Package className="h-4 w-4 text-primary" />
            Producción y Logística
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>MOQ (Mínimo de Orden)</Label>
              <Input
                type="number"
                {...register("min_order_qty")}
                className={inputClass}
              />
              {errors.min_order_qty && (
                <p className={errorClass}>{errors.min_order_qty.message}</p>
              )}
            </div>
            <div>
              <Label className={labelClass}>Lead Time (días)</Label>
              <Input
                type="number"
                {...register("lead_time_days")}
                className={inputClass}
              />
              {errors.lead_time_days && (
                <p className={errorClass}>{errors.lead_time_days.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <FileText className="h-4 w-4 text-primary" />
            Notas
          </div>
          <Textarea {...register("notes")} rows={4} className={inputClass} />
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/suppliers/${params.id}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}