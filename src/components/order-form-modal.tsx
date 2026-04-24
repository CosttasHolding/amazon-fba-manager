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

const inputClass = "h-9 bg-muted/50 border-border text-sm";
const labelClass = "text-xs text-muted-foreground";

function getTodayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

export function OrderFormModal({ open, onOpenChange, onSuccess }: OrderFormModalProps) {
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
    if (!qty || qty <= 0) { toast.error("Cantidad requerida"); return; }
    if (!cost || cost <= 0) { toast.error("Costo unitario requerido"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId || null,
          product_id: productId || null,
          po_number: poNumber || null,
          quantity: qty,
          unit_cost: cost,
          total_cost: qty * cost,
          currency,
          shipping_method: shippingMethod || null,
          status: "draft",
          order_date: orderDate || null,
          estimated_arrival: estimatedArrival || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear orden");
      }
      toast.success("Orden creada correctamente");
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
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Nueva Orden de Compra
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Proveedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={loadingOptions ? "Cargando..." : "Seleccionar"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} {s.country ? `(${s.country})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={loadingOptions ? "Cargando..." : "Seleccionar"} />
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
            <Label className={labelClass}>Número PO</Label>
            <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-001" className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelClass}>Cantidad *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Costo unit. *</Label>
              <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
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
              <Label className={labelClass}>Método envío</Label>
              <Select value={shippingMethod} onValueChange={setShippingMethod}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="air">Aire</SelectItem>
                  <SelectItem value="sea">Marítimo</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Fecha orden</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <Label className={labelClass}>Llegada estimada</Label>
            <Input type="date" value={estimatedArrival} onChange={(e) => setEstimatedArrival(e.target.value)} className={inputClass} />
          </div>

          <div>
            <Label className={labelClass}>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={2} className="bg-muted/50 border-border text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {saving ? "Guardando..." : "Crear Orden"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
