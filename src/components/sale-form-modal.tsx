"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ShoppingCart, DollarSign, Calculator } from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  unit_cost: number;
  fba_fee: number;
  referral_fee: number;
  total_cost: number;
}

interface SaleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const inputClass = "h-9 bg-muted/50 border-border text-sm";
const labelClass = "text-xs text-muted-foreground";

function getTodayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

const fmtMoney = (v: number) => {
  return "$" + (v || 0).toFixed(2);
};

export function SaleFormModal({ open, onOpenChange, onSuccess }: SaleFormModalProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [saleDate, setSaleDate] = useState(getTodayStr());
  const [unitsSold, setUnitsSold] = useState("");
  const [revenue, setRevenue] = useState("");
  const [amazonFees, setAmazonFees] = useState("");
  const [orderId, setOrderId] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const raw = await res.json();
        const list = raw.data || raw || [];
        setProducts(list);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open, fetchProducts]);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod && unitsSold) {
      const units = parseInt(unitsSold) || 0;
      if (units > 0) {
        setRevenue(String(Math.round(prod.sale_price * units * 100) / 100));
        const feesPerUnit = (prod.fba_fee || 0) + (prod.referral_fee || 0);
        setAmazonFees(String(Math.round(feesPerUnit * units * 100) / 100));
      }
    }
  };

  const handleUnitsChange = (value: string) => {
    setUnitsSold(value);
    const units = parseInt(value) || 0;
    if (selectedProductData && units > 0) {
      setRevenue(String(Math.round(selectedProductData.sale_price * units * 100) / 100));
      const feesPerUnit = (selectedProductData.fba_fee || 0) + (selectedProductData.referral_fee || 0);
      setAmazonFees(String(Math.round(feesPerUnit * units * 100) / 100));
    }
  };

  const revenueNum = parseFloat(revenue) || 0;
  const feesNum = parseFloat(amazonFees) || 0;
  const unitsNum = parseInt(unitsSold) || 0;
  const costPerUnit = selectedProductData ? (selectedProductData.total_cost || selectedProductData.unit_cost || 0) : 0;
  const totalCost = unitsNum * costPerUnit;
  const estimatedProfit = revenueNum - feesNum - totalCost;

  const resetForm = () => {
    setSelectedProduct("");
    setSaleDate(getTodayStr());
    setUnitsSold("");
    setRevenue("");
    setAmazonFees("");
    setOrderId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Selecciona un producto");
      return;
    }
    if (!unitsSold || parseInt(unitsSold) <= 0) {
      toast.error("Las unidades deben ser mayor a 0");
      return;
    }
    if (!revenue || parseFloat(revenue) <= 0) {
      toast.error("El revenue debe ser mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct,
          sale_date: saleDate,
          units_sold: parseInt(unitsSold),
          revenue: parseFloat(revenue),
          amazon_fees: parseFloat(amazonFees) || 0,
          order_id: orderId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al registrar venta");
      }
      toast.success("Venta registrada correctamente");
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Registrar Venta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className={labelClass}>Producto *</Label>
            <Select value={selectedProduct} onValueChange={handleProductChange}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder={loadingProducts ? "Cargando..." : "Seleccionar producto"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name + " (" + p.sku + ")"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Fecha de venta *</Label>
              <Input type="date" value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Unidades vendidas *</Label>
              <Input type="number" min="1" value={unitsSold}
                onChange={(e) => handleUnitsChange(e.target.value)}
                placeholder="0" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Revenue total ($)</Label>
              <Input type="number" step="0.01" value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0.00" className={inputClass} />
              {selectedProductData && unitsNum > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {"Sugerido: " + fmtMoney(selectedProductData.sale_price) + " x " + unitsNum}
                </p>
              )}
            </div>
            <div>
              <Label className={labelClass}>Amazon Fees ($)</Label>
              <Input type="number" step="0.01" value={amazonFees}
                onChange={(e) => setAmazonFees(e.target.value)}
                placeholder="0.00" className={inputClass} />
            </div>
          </div>

          <div>
            <Label className={labelClass}>Order ID (opcional)</Label>
            <Input value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="XXX-XXXXXXX-XXXXXXX" className={inputClass} />
          </div>

          {selectedProduct && unitsNum > 0 && revenueNum > 0 && (
            <div className={"rounded-xl border p-4 " + (estimatedProfit >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5")}>
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Estimaci\u00F3n</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Revenue</span>
                  <p className="font-medium text-foreground tabular-nums">{fmtMoney(revenueNum)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Costo + Fees</span>
                  <p className="font-medium text-foreground tabular-nums">{fmtMoney(totalCost + feesNum)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Profit</span>
                  <p className={"font-bold tabular-nums " + (estimatedProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {fmtMoney(estimatedProfit)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {saving ? "Guardando..." : "Registrar Venta"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
