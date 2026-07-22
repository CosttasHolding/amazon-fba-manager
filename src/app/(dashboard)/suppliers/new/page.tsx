"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PageHeader } from "@/components/ui/page-header";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

const COUNTRIES = [
  "China", "India", "Vietnam", "Taiwan", "Corea del Sur",
  "Tailandia", "Turquia", "Bangladesh", "Indonesia", "Otro",
];

const sectionClass = "rounded-2xl border border-border bg-background p-6 space-y-4";
const sectionTitleClass = "flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider mb-4";
const labelClass = "text-sm text-muted-foreground";
const errorClass = "text-xs text-destructive mt-1";
const inputClass = "bg-muted border-border";

export default function NewSupplierPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
        throw new Error(err.error || t("suppliers.create_error", locale));
      }

      toast.success(t("suppliers.create_success", locale).replace("{name}", data.name));
      router.push("/suppliers");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("suppliers.create_error", locale);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("suppliers.new_badge", locale)}
        title={t("suppliers.new_title", locale)}
        subtitle={t("suppliers.new_subtitle", locale)}
        breadcrumbs={[
          { label: t("suppliers.page_title", locale), href: "/suppliers" },
          { label: t("suppliers.new_title", locale) },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Factory className="h-4 w-4 text-primary" />
            {t("suppliers.general_info", locale)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name" className={labelClass}>{t("suppliers.edit_name", locale)}</Label>
              <Input id="name" {...register("name")} placeholder={t("suppliers.name_placeholder", locale)} className={inputClass} />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="alibaba_url" className={labelClass}>{t("suppliers.edit_alibaba_url", locale)}</Label>
              <Input id="alibaba_url" {...register("alibaba_url")} placeholder={t("suppliers.url_placeholder", locale)} className={inputClass} />
              {errors.alibaba_url && <p className={errorClass}>{errors.alibaba_url.message}</p>}
            </div>
            <div>
              <Label htmlFor="country" className={labelClass}>{t("suppliers.field_country", locale)}</Label>
              <Select value={watch("country") || ""} onValueChange={(val) => setValue("country", val)}>
                <SelectTrigger id="country" className={inputClass}><SelectValue placeholder={t("suppliers.country_placeholder", locale)} /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className={labelClass}>{t("suppliers.edit_status", locale)}</Label>
              <Select value={watch("status")} onValueChange={(val) => setValue("status", val as "active" | "inactive")}>
                <SelectTrigger id="status" className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("suppliers.status_active", locale)}</SelectItem>
                  <SelectItem value="inactive">{t("suppliers.status_inactive", locale)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rating" className={labelClass}>{t("suppliers.edit_rating", locale)}</Label>
              <Select value={watch("rating")?.toString() || ""} onValueChange={(val) => setValue("rating", val ? parseInt(val) : null)}>
                <SelectTrigger id="rating" className={inputClass}><SelectValue placeholder={t("suppliers.no_rating", locale)} /></SelectTrigger>
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
              <Label htmlFor="payment_terms" className={labelClass}>{t("suppliers.edit_payment_terms", locale)}</Label>
              <Input id="payment_terms" {...register("payment_terms")} placeholder={t("suppliers.payment_placeholder", locale)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Mail className="h-4 w-4 text-primary" />
            {t("suppliers.contact_info", locale)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name" className={labelClass}>{t("suppliers.field_contact_name", locale)}</Label>
              <Input id="contact_name" {...register("contact_name")} placeholder={t("suppliers.contact_name_placeholder", locale)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="contact_email" className={labelClass}>{t("suppliers.field_contact_email", locale)}</Label>
              <Input id="contact_email" type="email" {...register("contact_email")} placeholder={t("suppliers.email_placeholder", locale)} className={inputClass} />
              {errors.contact_email && <p className={errorClass}>{errors.contact_email.message}</p>}
            </div>
            <div>
              <Label htmlFor="contact_whatsapp" className={labelClass}>{t("suppliers.field_whatsapp", locale)}</Label>
              <Input id="contact_whatsapp" {...register("contact_whatsapp")} placeholder={t("suppliers.whatsapp_placeholder", locale)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <Package className="h-4 w-4 text-primary" />
            {t("suppliers.production_logistics", locale)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_order_qty" className={labelClass}>{t("suppliers.edit_moq", locale)}</Label>
              <Input id="min_order_qty" type="number" {...register("min_order_qty")} placeholder={t("suppliers.moq_placeholder", locale)} className={inputClass} />
              {errors.min_order_qty && <p className={errorClass}>{errors.min_order_qty.message}</p>}
            </div>
            <div>
              <Label htmlFor="lead_time_days" className={labelClass}>{t("suppliers.edit_lead_time", locale)}</Label>
              <Input id="lead_time_days" type="number" {...register("lead_time_days")} placeholder={t("suppliers.lead_time_placeholder", locale)} className={inputClass} />
              {errors.lead_time_days && <p className={errorClass}>{errors.lead_time_days.message}</p>}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionTitleClass}>
            <FileText className="h-4 w-4 text-primary" />
            {t("suppliers.edit_notes_section", locale)}
          </div>
          <Textarea id="notes" {...register("notes")} placeholder={t("suppliers.notes_placeholder", locale)} rows={4} className={inputClass} />
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push("/suppliers")}
            className="px-5 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            {t("suppliers.edit_cancel", locale)}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t("suppliers.edit_saving", locale) : t("suppliers.add_supplier", locale)}
          </button>
        </div>
      </form>
    </div>
  );
}
