"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supplierSchema, SupplierFormData } from "@/validations/supplier";
import { Supplier } from "@/types";

const COUNTRIES = [
  "China",
  "India",
  "Vietnam",
  "Taiwán",
  "Corea del Sur",
  "Tailandia",
  "Turquía",
  "Bangladesh",
  "Indonesia",
  "Otro",
];

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
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
    } catch (error) {
      console.error("Error:", error);
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

      toast({
        title: "Proveedor actualizado",
        description: `${data.name} se actualizó correctamente`,
      });

      router.push(`/suppliers/${params.id}`);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Proveedor</h1>
          <p className="text-sm text-muted-foreground">
            Modifica los datos del proveedor
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Info básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Información del Proveedor
            </CardTitle>
            <CardDescription>Datos principales del proveedor</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nombre del Proveedor *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="alibaba_url">URL Alibaba / 1688</Label>
              <Input id="alibaba_url" {...register("alibaba_url")} />
              {errors.alibaba_url && (
                <p className="text-sm text-red-500 mt-1">{errors.alibaba_url.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="country">País</Label>
              <Select
                value={watch("country") || ""}
                onValueChange={(val) => setValue("country", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={watch("status")}
                onValueChange={(val) => setValue("status", val as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rating">Rating (1-5)</Label>
              <Select
                value={watch("rating")?.toString() || ""}
                onValueChange={(val) => setValue("rating", val ? parseInt(val) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⭐ 1</SelectItem>
                  <SelectItem value="2">⭐ 2</SelectItem>
                  <SelectItem value="3">⭐ 3</SelectItem>
                  <SelectItem value="4">⭐ 4</SelectItem>
                  <SelectItem value="5">⭐ 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_terms">Términos de Pago</Label>
              <Input id="payment_terms" {...register("payment_terms")} />
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
            <CardDescription>Datos del contacto principal</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Nombre de Contacto</Label>
              <Input id="contact_name" {...register("contact_name")} />
            </div>

            <div>
              <Label htmlFor="contact_email">Email</Label>
              <Input id="contact_email" type="email" {...register("contact_email")} />
              {errors.contact_email && (
                <p className="text-sm text-red-500 mt-1">{errors.contact_email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contact_whatsapp">WhatsApp</Label>
              <Input id="contact_whatsapp" {...register("contact_whatsapp")} />
            </div>
          </CardContent>
        </Card>

        {/* Producción */}
        <Card>
          <CardHeader>
            <CardTitle>Producción y Logística</CardTitle>
            <CardDescription>MOQ, tiempos de producción</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_order_qty">MOQ (Mínimo de Orden)</Label>
              <Input id="min_order_qty" type="number" {...register("min_order_qty")} />
              {errors.min_order_qty && (
                <p className="text-sm text-red-500 mt-1">{errors.min_order_qty.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lead_time_days">Lead Time (días)</Label>
              <Input id="lead_time_days" type="number" {...register("lead_time_days")} />
              {errors.lead_time_days && (
                <p className="text-sm text-red-500 mt-1">{errors.lead_time_days.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} {...register("notes")} />
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}