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
import { createSupplier } from "@/lib/actions/suppliers";
import { Loader2, Factory, Mail, Package, FileText } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { FormErrorMessage } from "@/components/ui/announcer";
import { inputClass, labelClass, sectionLabel } from "@/lib/form-constants";

const COUNTRY_SUGGESTIONS = [
  "China", "India", "Vietnam", "Taiwan", "Corea del Sur",
  "Tailandia", "Bangladesh", "Indonesia", "Estados Unidos",
  "México", "Colombia", "Argentina", "Brasil", "Otro",
];

const STAR_OPTIONS = [
  { value: "1", label: "⭐" },
  { value: "2", label: "⭐⭐" },
  { value: "3", label: "⭐⭐⭐" },
  { value: "4", label: "⭐⭐⭐⭐" },
  { value: "5", label: "⭐⭐⭐⭐⭐" },
];

interface SupplierFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SupplierFormModal({ open, onOpenChange, onSuccess }: SupplierFormModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { locale } = useLocale();

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
      await createSupplier(data);
      toast.success(t("suppliers.create_success", locale));
      form.reset();
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error_saving", locale);
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
            {t("suppliers.new_supplier", locale)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[75vh] overflow-y-auto pe-1 space-y-4">
          <div>
            <div className={sectionLabel}>
              <Factory className="h-3 w-3" />
              {t("suppliers.edit_info", locale)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="supplier-name" className={labelClass}>{t("suppliers.edit_name", locale)}</Label>
                <Input id="supplier-name" {...form.register("name")} placeholder={t("suppliers.name_placeholder", locale)} className={inputClass} />
                <FormErrorMessage message={form.formState.errors.name?.message} />
              </div>
              <div>
                <Label htmlFor="supplier-country" className={labelClass}>{t("suppliers.edit_country", locale)}</Label>
                <Input
                  id="supplier-country"
                  {...form.register("country")}
                  placeholder={t("suppliers.country_edit_placeholder", locale)}
                  list="country-suggestions"
                  className={inputClass}
                />
                <datalist id="country-suggestions">
                  {COUNTRY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="supplier-status" className={labelClass}>{t("suppliers.edit_status", locale)}</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as "active" | "inactive")}
                >
                  <SelectTrigger id="supplier-status" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("suppliers.edit_status_active", locale)}</SelectItem>
                    <SelectItem value="inactive">{t("suppliers.edit_status_inactive", locale)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Label htmlFor="supplier-alibaba-url" className={labelClass}>{t("suppliers.edit_alibaba_url", locale)}</Label>
                <Input id="supplier-alibaba-url" {...form.register("alibaba_url")} placeholder={t("suppliers.url_placeholder", locale)} className={inputClass} />
                <FormErrorMessage message={form.formState.errors.alibaba_url?.message} />
              </div>
              <div>
                <Label htmlFor="supplier-rating" className={labelClass}>{t("suppliers.form_rating_label", locale)}</Label>
                <Select
                  value={form.watch("rating")?.toString() || ""}
                  onValueChange={(v) => form.setValue("rating", v ? parseInt(v) : null)}
                >
                  <SelectTrigger id="supplier-rating" className={inputClass}><SelectValue placeholder={"—"} /></SelectTrigger>
                  <SelectContent>
                    {STAR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
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
                <Label htmlFor="supplier-contact-name" className={labelClass}>{t("suppliers.edit_contact_person", locale)}</Label>
                <Input id="supplier-contact-name" {...form.register("contact_name")} placeholder={t("suppliers.contact_name_placeholder", locale)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="supplier-contact-email" className={labelClass}>{t("suppliers.edit_email", locale)}</Label>
                <Input id="supplier-contact-email" {...form.register("contact_email")} placeholder={t("suppliers.email_placeholder", locale)} className={inputClass} />
                <FormErrorMessage message={form.formState.errors.contact_email?.message} />
              </div>
              <div>
                <Label htmlFor="supplier-contact-whatsapp" className={labelClass}>{t("suppliers.field_whatsapp", locale)}</Label>
                <Input id="supplier-contact-whatsapp" {...form.register("contact_whatsapp")} placeholder={t("suppliers.whatsapp_placeholder", locale)} className={inputClass} />
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
                <Label htmlFor="supplier-payment-terms" className={labelClass}>{t("suppliers.edit_payment_terms", locale)}</Label>
                <Input id="supplier-payment-terms" {...form.register("payment_terms")} placeholder={t("suppliers.payment_edit_placeholder", locale)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="supplier-min-order-qty" className={labelClass}>{t("suppliers.edit_moq", locale)}</Label>
                <Input
                  id="supplier-min-order-qty"
                  type="number"
                  {...form.register("min_order_qty", { valueAsNumber: true })}
                  placeholder={t("suppliers.moq_placeholder", locale)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="supplier-lead-time-days" className={labelClass}>{t("suppliers.edit_lead_time", locale)}</Label>
                <Input
                  id="supplier-lead-time-days"
                  type="number"
                  {...form.register("lead_time_days", { valueAsNumber: true })}
                  placeholder={t("suppliers.lead_time_placeholder", locale)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <FileText className="h-3 w-3" />
              {t("suppliers.notes", locale)}
            </div>
            <Textarea
              {...form.register("notes")}
              placeholder={t("suppliers.notes_placeholder", locale)}
              className="min-h-[80px] bg-muted/50 border-border text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border sticky bottom-0 bg-card pb-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t("common.cancel", locale)}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
              {saving ? t("common.saving", locale) : t("suppliers.create_button", locale)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
