"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Loader2, ClipboardList, DollarSign } from "lucide-react";
import { createOrder } from "@/lib/actions/orders";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { inputClass, labelClass, getTodayStr } from "@/lib/form-constants";

interface SupplierOption {
  id: string;
  name: string;
  country: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface OrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OrderFormModal({ open, onOpenChange, onSuccess }: OrderFormModalProps) {
  const { locale } = useLocale();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [shippingMethod, setShippingMethod] = useState("");
  const [orderDate, setOrderDate] = useState(getTodayStr());
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [notes, setNotes] = useState("");

  const fetchOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [supRes, prodRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/products"),
      ]);
      if (supRes.ok) {
        const raw = await supRes.json();
        setSuppliers(raw.data || raw || []);
      }
      if (prodRes.ok) {
        const raw = await prodRes.json();
        setProducts(raw.data || raw || []);
      }
    } catch (error) {
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchOptions();
  }, [open, fetchOptions]);

  const resetForm = () => {
    setSupplierId("");
    setProductId("");
    setPoNumber("");
    setQuantity("");
    setUnitCost("");
    setCurrency("USD");
    setShippingMethod("");
    setOrderDate(getTodayStr());
    setEstimatedArrival("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    const cost = parseFloat(unitCost);
    if (!qty || qty <= 0) { toast.error(t("orders.error_quantity_required", locale)); return; }
    if (!cost || cost <= 0) { toast.error(t("orders.error_unit_cost_required", locale)); return; }

    setSaving(true);
    try {
      await createOrder({
        supplier_id: supplierId || null,
        product_id: productId || null,
        po_number: poNumber || null,
        quantity: qty,
        unit_cost: cost,
        total_cost: qty * cost,
        currency,
        exchange_rate: 1,
        shipping_method: (shippingMethod || null) as "air" | "sea" | "express" | null,
        status: "draft",
        order_date: orderDate || null,
        estimated_arrival: estimatedArrival || null,
        notes: notes || null,
      });
      toast.success(t("orders.created_success", locale));
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error_saving", locale);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t("orders.new_order_modal", locale)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="order-supplier" className={labelClass}>{t("common.supplier", locale)}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="order-supplier" className={inputClass}>
                  <SelectValue placeholder={loadingOptions ? t("common.loading", locale) : t("common.select", locale)} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} {s.country ? `(${s.country})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="order-product" className={labelClass}>{t("common.product", locale)}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="order-product" className={inputClass}>
                  <SelectValue placeholder={loadingOptions ? t("common.loading", locale) : t("common.select", locale)} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="order-po-number" className={labelClass}>{t("orders.po_number_label", locale)}</Label>
            <Input id="order-po-number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder={t("orders.po_placeholder", locale)} className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="order-quantity" className={labelClass}>{t("orders.quantity_label", locale)}</Label>
              <Input id="order-quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="order-unit-cost" className={labelClass}>{t("orders.unit_cost_label", locale)}</Label>
              <Input id="order-unit-cost" type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="order-currency" className={labelClass}>{t("orders.currency_label", locale)}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="order-currency" className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="order-shipping-method" className={labelClass}>{t("orders.shipping_method_label", locale)}</Label>
              <Select value={shippingMethod} onValueChange={setShippingMethod}>
                <SelectTrigger id="order-shipping-method" className={inputClass}><SelectValue placeholder={t("common.select", locale)} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="air">{t("orders.shipping_air", locale)}</SelectItem>
                  <SelectItem value="sea">{t("orders.shipping_sea", locale)}</SelectItem>
                  <SelectItem value="express">{t("orders.shipping_express", locale)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="order-date" className={labelClass}>{t("orders.order_date_label", locale)}</Label>
              <Input id="order-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <Label htmlFor="order-estimated-arrival" className={labelClass}>{t("orders.estimated_arrival_label", locale)}</Label>
            <Input id="order-estimated-arrival" type="date" value={estimatedArrival} onChange={(e) => setEstimatedArrival(e.target.value)} className={inputClass} />
          </div>

          <div>
            <Label htmlFor="order-notes" className={labelClass}>{t("common.notes", locale)}</Label>
            <Textarea id="order-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("orders.notes_placeholder", locale)} rows={2} className="bg-muted/50 border-border text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {t("common.cancel", locale)}
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {saving ? t("common.saving", locale) : t("orders.create_order", locale)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
