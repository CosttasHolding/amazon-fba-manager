"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/validations/product";
import { z } from "zod";
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
import { useEffect, useState } from "react";
import { createProduct } from "@/lib/actions/products";
import { Loader2, Package, DollarSign, Tag, FileText, Link2, CheckCircle2 } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { FormErrorMessage } from "@/components/ui/announcer";
import { inputClass, labelClass, sectionLabel } from "@/lib/form-constants";
import { useUrlScrape } from "@/hooks/use-url-scrape";
import { mapAmazonCategory } from "@/lib/scraping/category";
import { FormDialogFooter, FormDialogLayout } from "@/components/ui/form-dialog";

type ProductFormData = z.infer<typeof productSchema>;

import { MARKETPLACES, PRODUCT_CATEGORIES } from "@/lib/constants";

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProductFormModal({ open, onOpenChange, onSuccess }: ProductFormModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { locale } = useLocale();

  const STATUSES = [
    { value: "active", label: t("products.status_active", locale) },
    { value: "paused", label: t("products.status_paused", locale) },
    { value: "discontinued", label: t("products.status_discontinued", locale) },
  ] as const;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "",
      asin: "",
      name: "",
      category: null,
      marketplace: "US",
      status: "active",
      unitCost: 0,
      shippingCost: 0,
      prepCost: 0,
      taxes: 0,
      salePrice: 0,
      referralFee: 0,
      fbaFee: 0,
      storageFeeMonthly: 0,
      otherFees: 0,
      weightKg: null,
      notes: "",
    },
  });

  const { setValue } = form;
  const urlScrape = useUrlScrape();

  useEffect(() => {
    if (urlScrape.scrapedData && urlScrape.platform === "amazon") {
      const data = urlScrape.scrapedData;
      if (data.platform === "amazon") {
        if (data.name) setValue("name", data.name);
        if (data.asin) setValue("asin", data.asin);
        if (data.price && data.price > 0) setValue("salePrice", data.price);
        if (data.weight_kg && data.weight_kg > 0) setValue("weightKg", data.weight_kg);
        if (data.category) {
          const mapped = mapAmazonCategory(data.category);
          if (mapped) {
            setValue("category", mapped);
          }
        }
      }
    }
  }, [urlScrape.scrapedData, urlScrape.platform, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      await createProduct(data);
      toast.success(t("products.create_success", locale));
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
    <FormDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title={t("products.new_product", locale)}
      icon={<Package className="h-5 w-5 text-primary" />}
      contentClassName="max-w-2xl bg-card border-border"
    >
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[75vh] overflow-y-auto pe-1 space-y-4">
          <div className="mb-4 p-3 rounded-lg border border-dashed border-border bg-muted/30">
            <label className={sectionLabel}>
              <Link2 className="w-3.5 h-3.5" />
              URL del producto (Amazon)
            </label>
            <div className="relative">
              <Input
                placeholder="https://amazon.com/dp/B08N5WRWNW..."
                value={urlScrape.url}
                onChange={(e) => urlScrape.setUrl(e.target.value)}
                className={inputClass + " pr-20"}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {urlScrape.isScraping && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {!urlScrape.isScraping && urlScrape.platform === "amazon" && urlScrape.scrapedData && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            {urlScrape.isScraping && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Extrayendo datos...
              </p>
            )}
            {urlScrape.error && (
              <p className="text-xs text-destructive mt-1">{urlScrape.error}</p>
            )}
          </div>

          <div>
            <div className={sectionLabel}>
              <Tag className="h-3 w-3" />
              {t("products.basic_info", locale)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className={labelClass}>{t("products.form_name_label", locale)}</Label>
                <Input id="name" {...form.register("name")} placeholder={t("products.form_name_placeholder", locale)} className={inputClass} />
                <FormErrorMessage message={form.formState.errors.name?.message} />
              </div>
              <div>
                <Label htmlFor="sku" className={labelClass}>{t("products.edit_sku", locale)}</Label>
                <Input id="sku" {...form.register("sku")} placeholder="SKU-001" className={inputClass} />
                <FormErrorMessage message={form.formState.errors.sku?.message} />
              </div>
              <div>
                <Label htmlFor="asin" className={labelClass}>{t("products.edit_asin", locale)}</Label>
                <Input id="asin" {...form.register("asin")} placeholder={t("products.asin_placeholder", locale)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="category" className={labelClass}>{t("products.edit_category", locale)}</Label>
                <Select
                  value={form.watch("category") || ""}
                  onValueChange={(v) => form.setValue("category", v as ProductFormData["category"])}
                >
                  <SelectTrigger id="category" className={inputClass}><SelectValue placeholder={t("common.select", locale)} /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="marketplace" className={labelClass}>{t("products.edit_marketplace", locale)}</Label>
                <Select
                  value={form.watch("marketplace")}
                  onValueChange={(v) => form.setValue("marketplace", v as ProductFormData["marketplace"])}
                >
                  <SelectTrigger id="marketplace" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MARKETPLACES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status" className={labelClass}>{t("products.edit_status", locale)}</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as ProductFormData["status"])}
                >
                  <SelectTrigger id="status" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="weightKg" className={labelClass}>{t("common.weight_kg", locale)}</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.01"
                  {...form.register("weightKg", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <DollarSign className="h-3 w-3" />
              {t("products.costs_section", locale)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="unitCost" className={labelClass}>{t("products.form_unit_cost_label", locale)}</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  {...form.register("unitCost", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="shippingCost" className={labelClass}>{t("products.form_shipping_label", locale)}</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  step="0.01"
                  {...form.register("shippingCost", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="prepCost" className={labelClass}>{t("products.form_prep_label", locale)}</Label>
                <Input
                  id="prepCost"
                  type="number"
                  step="0.01"
                  {...form.register("prepCost", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="taxes" className={labelClass}>{t("products.form_taxes_label", locale)}</Label>
                <Input
                  id="taxes"
                  type="number"
                  step="0.01"
                  {...form.register("taxes", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <DollarSign className="h-3 w-3" />
              {t("products.pricing_section", locale)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="salePrice" className={labelClass}>{t("products.form_sale_price_label", locale)}</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  {...form.register("salePrice", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="referralFee" className={labelClass}>{t("products.form_referral_fee_label", locale)}</Label>
                <Input
                  id="referralFee"
                  type="number"
                  step="0.01"
                  {...form.register("referralFee", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="fbaFee" className={labelClass}>{t("products.form_fba_fee_label", locale)}</Label>
                <Input
                  id="fbaFee"
                  type="number"
                  step="0.01"
                  {...form.register("fbaFee", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="storageFeeMonthly" className={labelClass}>{t("products.form_storage_label", locale)}</Label>
                <Input
                  id="storageFeeMonthly"
                  type="number"
                  step="0.01"
                  {...form.register("storageFeeMonthly", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="otherFees" className={labelClass}>{t("products.form_other_fees_label", locale)}</Label>
                <Input
                  id="otherFees"
                  type="number"
                  step="0.01"
                  {...form.register("otherFees", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <FileText className="h-3 w-3" />
              {t("common.notes", locale)}
            </div>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder={t("products.form_notes_placeholder", locale)}
              className="min-h-[80px] bg-muted/50 border-border text-sm"
            />
          </div>

          <FormDialogFooter
            onCancel={() => onOpenChange(false)}
            saving={saving}
            locale={locale}
            saveLabel={t("products.form_create_button", locale)}
            saveIcon={<Package className="h-4 w-4" />}
            sticky
          />
        </form>
    </FormDialogLayout>
  );
}
