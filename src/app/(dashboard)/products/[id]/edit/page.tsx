"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/validations/product";
import type { z } from "zod";
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
import { Save, Loader2, Package, DollarSign, Users, Info, Weight } from "lucide-react";
import { toast } from "sonner";
import { FeeCalculatorInline } from "@/components/fee-calculator-inline";
import { calcFBAFee, calcRefFee } from "@/lib/calculations";
import { MARKETPLACES, PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@/lib/constants";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { inputClass, labelClass, sectionLabel } from "@/lib/form-constants";

type ProductFormData = z.infer<typeof productSchema>;

interface SupplierOption {
  id: string;
  name: string;
  country: string;
  min_order_qty: number | null;
  lead_time_days: number | null;
}

interface LinkedSupplier {
  id: string;
  unit_cost: number;
  moq: number;
  lead_time_days: number;
  is_primary: boolean;
  suppliers: { id: string; name: string };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [originalSupplier, setOriginalSupplier] = useState("");
  const [supplierData, setSupplierData] = useState({
    unit_cost: "",
    moq: "",
    lead_time_days: "",
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;
  const watched = watch();

  useEffect(() => {
    const w = watched.weightKg;
    if (w && w > 0) {
      const fee = calcFBAFee(w);
      setValue("fbaFee", Number(fee.toFixed(2)));
    }
  }, [watched.weightKg, setValue]);

  useEffect(() => {
    const sp = watched.salePrice;
    if (sp && sp > 0) {
      const fee = calcRefFee(sp);
      setValue("referralFee", Number(fee.toFixed(2)));
    }
  }, [watched.salePrice, setValue]);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch("/api/products/" + params.id);
      if (!res.ok) throw new Error("Error");
      const raw = await res.json();
      const d = raw.data ? raw.data : raw;
      setProductName(d.name || t("products.unnamed", locale));
      reset({
        name: d.name || "",
        asin: d.asin || "",
        sku: d.sku || "",
        category: d.category || "Other",
        status: d.status || "active",
        marketplace: d.marketplace || "US",
        unitCost: d.unit_cost ?? 0,
        salePrice: d.sale_price ?? 0,
        fbaFee: d.fba_fee ?? 0,
        referralFee: d.referral_fee ?? 0,
        shippingCost: d.shipping_cost ?? 0,
        storageFeeMonthly: d.storage_fee_monthly ?? 0,
        prepCost: d.prep_cost ?? 0,
        taxes: d.taxes ?? 0,
        otherFees: d.other_fees ?? 0,
        weightKg: d.weight_kg ?? null,
        notes: d.notes || "",
      });
    } catch {
      toast.error(t("products.error_load_product_detail", locale));
      router.push("/products");
    } finally {
      setLoading(false);
    }
  }, [params.id, reset, router, locale]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const raw = await res.json();
        setSuppliers(raw.data || raw || []);
      }
    } catch (error) {
    }
  }, []);

  const fetchLinkedSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/products/" + params.id + "/suppliers");
      if (res.ok) {
        const raw = await res.json();
        const data: LinkedSupplier[] = Array.isArray(raw) ? raw : raw.data || [];
        const primary = data.find((s) => s.is_primary) || data[0];
        if (primary) {
          setSelectedSupplier(primary.suppliers.id);
          setOriginalSupplier(primary.suppliers.id);
          setSupplierData({
            unit_cost: primary.unit_cost ? String(primary.unit_cost) : "",
            moq: primary.moq ? String(primary.moq) : "",
            lead_time_days: primary.lead_time_days ? String(primary.lead_time_days) : "",
          });
        }
      }
    } catch (error) {
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
      fetchSuppliers();
      fetchLinkedSuppliers();
    }
  }, [params.id, fetchProduct, fetchSuppliers, fetchLinkedSuppliers]);

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    if (supplierId === "none" || !supplierId) {
      setSupplierData({ unit_cost: "", moq: "", lead_time_days: "" });
      return;
    }
    const found = suppliers.find((s) => s.id === supplierId);
    if (found && supplierId !== originalSupplier) {
      setSupplierData({
        unit_cost: "",
        moq: found.min_order_qty ? String(found.min_order_qty) : "",
        lead_time_days: found.lead_time_days ? String(found.lead_time_days) : "",
      });
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/products/" + params.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("products.update_error", locale));
      }

      const eff = selectedSupplier === "none" ? "" : selectedSupplier;
      if (originalSupplier && !eff) {
        await fetch("/api/products/" + params.id + "/suppliers?supplier_id=" + originalSupplier, { method: "DELETE" });
      }
      if (eff) {
        if (originalSupplier && originalSupplier !== eff) {
          await fetch("/api/products/" + params.id + "/suppliers?supplier_id=" + originalSupplier, { method: "DELETE" });
        }
        await fetch("/api/products/" + params.id + "/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: eff,
            unit_cost: parseFloat(supplierData.unit_cost) || 0,
            moq: parseInt(supplierData.moq) || null,
            lead_time_days: parseInt(supplierData.lead_time_days) || null,
            is_primary: true,
          }),
        });
      }

      toast.success(t("products.update_success", locale));
      router.push("/products/" + params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("products.update_error", locale);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const statusVal = watch("status");
  const categoryVal = watch("category");
  const marketplaceVal = watch("marketplace");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => router.push("/products/" + params.id)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border p-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("products.edit_title", locale).replace("{name}", productName)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-5">

          <div>
            <div className={sectionLabel}>
              <Package className="h-3 w-3" />
              {t("products.basic_info", locale)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className={labelClass}>{t("products.name_field", locale)}</Label>
                <Input id="name" {...register("name")} className={inputClass} />
                {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="asin" className={labelClass}>{t("products.edit_asin", locale)}</Label>
                <Input id="asin" {...register("asin")} placeholder={t("products.asin_placeholder", locale)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="sku" className={labelClass}>{t("common.sku", locale)}</Label>
                <Input id="sku" {...register("sku")} className={inputClass} />
                {errors.sku && <p className="text-xs text-destructive mt-0.5">{errors.sku.message}</p>}
              </div>
              <div>
                <Label htmlFor="category" className={labelClass}>{t("products.edit_category", locale)}</Label>
                <Select value={categoryVal || "Other"} onValueChange={(v) => setValue("category", v as ProductFormData["category"])}>
                  <SelectTrigger id="category" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="marketplace" className={labelClass}>{t("products.edit_marketplace", locale)}</Label>
                <Select value={marketplaceVal || "US"} onValueChange={(v) => setValue("marketplace", v as ProductFormData["marketplace"])}>
                  <SelectTrigger id="marketplace" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MARKETPLACES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status" className={labelClass}>{t("products.edit_status", locale)}</Label>
                <Select value={statusVal} onValueChange={(v) => setValue("status", v as ProductFormData["status"])}>
                  <SelectTrigger id="status" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="weightKg" className={labelClass}>
                  <span className="flex items-center gap-1"><Weight className="h-3 w-3" /> {t("products.edit_weight", locale)}</span>
                </Label>
                <Input id="weightKg" type="number" step="0.01" {...register("weightKg", { valueAsNumber: true })} className={inputClass} />
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("products.fee_auto_hint", locale)}</p>
              </div>
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <DollarSign className="h-3 w-3" />
              {t("products.costs_and_prices", locale)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="unitCost" className={labelClass}>{t("products.unit_cost_field", locale)}</Label>
                <Input id="unitCost" type="number" step="0.01" {...register("unitCost", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="salePrice" className={labelClass}>{t("products.sale_price_field", locale)}</Label>
                <Input id="salePrice" type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="fbaFee" className={labelClass}>{t("products.fba_fee_field", locale)}</Label>
                <Input id="fbaFee" type="number" step="0.01" {...register("fbaFee", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="referralFee" className={labelClass}>{t("products.referral_fee_field", locale)}</Label>
                <Input id="referralFee" type="number" step="0.01" {...register("referralFee", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="shippingCost" className={labelClass}>{t("products.shipping_cost_field", locale)}</Label>
                <Input id="shippingCost" type="number" step="0.01" {...register("shippingCost", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="storageFeeMonthly" className={labelClass}>{t("products.storage_cost_field", locale)}</Label>
                <Input id="storageFeeMonthly" type="number" step="0.01" {...register("storageFeeMonthly", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="prepCost" className={labelClass}>{t("products.prep_cost_field", locale)}</Label>
                <Input id="prepCost" type="number" step="0.01" {...register("prepCost", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="taxes" className={labelClass}>{t("products.taxes_field", locale)}</Label>
                <Input id="taxes" type="number" step="0.01" {...register("taxes", { valueAsNumber: true })} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="otherFees" className={labelClass}>{t("products.other_fees_field", locale)}</Label>
                <Input id="otherFees" type="number" step="0.01" {...register("otherFees", { valueAsNumber: true })} className={inputClass} />
              </div>
            </div>

            <FeeCalculatorInline
              unitCost={watched.unitCost || 0}
              shippingCost={watched.shippingCost || 0}
              prepCost={watched.prepCost || 0}
              taxes={watched.taxes || 0}
              salePrice={watched.salePrice || 0}
              weightKg={watched.weightKg || 0}
              storageFeeMonthly={watched.storageFeeMonthly || 0}
              otherFees={watched.otherFees || 0}
            />
          </div>

          <div>
            <div className={sectionLabel}>
              <Users className="h-3 w-3" />
              {t("products.supplier", locale)}
            </div>
            <Select value={selectedSupplier || "none"} onValueChange={handleSupplierChange}>
              <SelectTrigger id="supplier" className={inputClass}>
                <SelectValue placeholder={t("products.edit_no_supplier", locale)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("products.edit_no_supplier", locale)}</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name + (s.country ? " (" + s.country + ")" : "")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSupplier && selectedSupplier !== "none" && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label htmlFor="supplier_unit_cost" className={labelClass}>{t("products.edit_supplier_unit_cost", locale)}</Label>
                  <Input id="supplier_unit_cost" type="number" step="0.01" value={supplierData.unit_cost}
                    onChange={(e) => setSupplierData((p) => ({ ...p, unit_cost: e.target.value }))}
                    placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="supplier_moq" className={labelClass}>{t("suppliers.moq_short", locale)}</Label>
                  <Input id="supplier_moq" type="number" value={supplierData.moq}
                    onChange={(e) => setSupplierData((p) => ({ ...p, moq: e.target.value }))}
                    placeholder={t("products.moq_placeholder", locale)} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="supplier_lead_time" className={labelClass}>{t("products.lead_time_field", locale)}</Label>
                  <Input id="supplier_lead_time" type="number" value={supplierData.lead_time_days}
                    onChange={(e) => setSupplierData((p) => ({ ...p, lead_time_days: e.target.value }))}
                    placeholder={t("products.lead_time_placeholder", locale)} className={inputClass} />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className={sectionLabel}>
              <Info className="h-3 w-3" />
              {t("products.additional_details", locale)}
            </div>
            <div className="mt-3">
              <Label htmlFor="notes" className={labelClass}>{t("products.notes_placeholder", locale)}</Label>
              <Textarea id="notes" {...register("notes")} placeholder={t("products.notes_placeholder", locale)} rows={2} className="bg-muted/50 border-border text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border sticky bottom-0 bg-card">
            <button type="button"
              onClick={() => router.push("/products/" + params.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {t("products.edit_cancel", locale)}
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("products.edit_saving", locale) : t("products.edit_save", locale)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
