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
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { inputClass, labelClass, sectionLabel } from "@/lib/form-constants";

const COUNTRY_SUGGESTIONS = [
  "China", "India", "Vietnam", "Taiwan", "Corea del Sur",
  "Tailandia", "Bangladesh", "Indonesia", "Estados Unidos",
  "México", "Colombia", "Argentina", "Brasil", "Otro",
];

const STAR_OPTIONS = [
  { value: "1", label: "\u2B50" },
  { value: "2", label: "\u2B50\u2B50" },
  { value: "3", label: "\u2B50\u2B50\u2B50" },
  { value: "4", label: "\u2B50\u2B50\u2B50\u2B50" },
  { value: "5", label: "\u2B50\u2B50\u2B50\u2B50\u2B50" },
];

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useLocale();
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
        setSupplierName(data.name || t("suppliers.page_title", locale));
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
  }, [params.id, reset, router, locale]);

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
        throw new Error(err.error || t("suppliers.update_error", locale));
      }
      toast.success(t("suppliers.update_success", locale));
      router.push("/suppliers/" + params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("suppliers.update_error", locale);
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
            {t("suppliers.edit_title", locale).replace("{name}", supplierName)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-5">

          <div>
            <div className={sectionLabel}>
              <Factory className="h-3 w-3" />
              {t("suppliers.edit_info", locale)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className={labelClass}>{t("suppliers.edit_name", locale)}</Label>
                <Input id="name" {...register("name")} className={inputClass} />
                {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="country" className={labelClass}>{t("suppliers.edit_country", locale)}</Label>
                <Input
                  id="country"
                  {...register("country")}
                  placeholder={t("suppliers.country_edit_placeholder", locale)}
                  list="country-suggestions-edit"
                  className={inputClass}
                />
                <datalist id="country-suggestions-edit">
                  {COUNTRY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="status" className={labelClass}>{t("suppliers.edit_status", locale)}</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as "active" | "inactive")}
                >
                  <SelectTrigger id="status" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("suppliers.edit_status_active", locale)}</SelectItem>
                    <SelectItem value="inactive">{t("suppliers.edit_status_inactive", locale)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="alibaba_url" className={labelClass}>{t("suppliers.edit_alibaba_url", locale)}</Label>
                <Input id="alibaba_url" {...register("alibaba_url")} placeholder={t("suppliers.url_placeholder", locale)} className={inputClass} />
                {errors.alibaba_url && <p className="text-xs text-destructive mt-0.5">{errors.alibaba_url.message}</p>}
              </div>
              <div>
                <Label htmlFor="rating" className={labelClass}>{t("suppliers.edit_rating", locale)}</Label>
                <Select
                  value={watch("rating")?.toString() || ""}
                  onValueChange={(v) => setValue("rating", v ? parseInt(v) : null)}
                >
                  <SelectTrigger id="rating" className={inputClass}><SelectValue placeholder="--" /></SelectTrigger>
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
              {t("suppliers.contact", locale)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="contact_name" className={labelClass}>{t("suppliers.edit_contact_person", locale)}</Label>
                <Input id="contact_name" {...register("contact_name")} placeholder={t("suppliers.contact_name_placeholder", locale)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="contact_email" className={labelClass}>{t("suppliers.field_contact_email", locale)}</Label>
                <Input id="contact_email" {...register("contact_email")} placeholder={t("suppliers.email_placeholder", locale)} className={inputClass} />
                {errors.contact_email && <p className="text-xs text-destructive mt-0.5">{errors.contact_email.message}</p>}
              </div>
              <div>
                <Label htmlFor="contact_whatsapp" className={labelClass}>{t("suppliers.field_whatsapp", locale)}</Label>
                <Input id="contact_whatsapp" {...register("contact_whatsapp")} placeholder={t("suppliers.whatsapp_placeholder", locale)} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <Package className="h-3 w-3" />
              {t("suppliers.edit_commercial_conditions", locale)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="payment_terms" className={labelClass}>{t("suppliers.edit_payment_terms", locale)}</Label>
                <Input id="payment_terms" {...register("payment_terms")} placeholder={t("suppliers.payment_edit_placeholder", locale)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="min_order_qty" className={labelClass}>{t("suppliers.edit_moq", locale)}</Label>
                <Input id="min_order_qty" type="number" {...register("min_order_qty", { valueAsNumber: true })} placeholder={t("suppliers.moq_placeholder", locale)} className={inputClass} />
                {errors.min_order_qty && <p className="text-xs text-destructive mt-0.5">{errors.min_order_qty.message}</p>}
              </div>
              <div>
                <Label htmlFor="lead_time_days" className={labelClass}>{t("suppliers.edit_lead_time", locale)}</Label>
                <Input id="lead_time_days" type="number" {...register("lead_time_days", { valueAsNumber: true })} placeholder={t("suppliers.lead_time_placeholder", locale)} className={inputClass} />
                {errors.lead_time_days && <p className="text-xs text-destructive mt-0.5">{errors.lead_time_days.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <FileText className="h-3 w-3" />
              {t("suppliers.edit_notes_section", locale)}
            </div>
            <Textarea id="notes" {...register("notes")} placeholder={t("suppliers.notes_placeholder", locale)} rows={2} className="bg-muted/50 border-border text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border sticky bottom-0 bg-card">
            <button type="button"
              onClick={() => router.push("/suppliers/" + params.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {t("suppliers.edit_cancel", locale)}
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("suppliers.edit_saving", locale) : t("suppliers.edit_save", locale)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

