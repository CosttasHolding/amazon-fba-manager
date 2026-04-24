"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { returnSchema, type ReturnFormData } from "@/validations/return";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fmt } from "@/lib/utils";
import { RotateCcw, ShieldCheck, Plus, Loader2 } from "lucide-react";

type Tab = "returns" | "reimbursements";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface ReturnItem {
  id: string;
  products: { name: string; sku: string } | null;
  quantity: number;
  return_reason: string | null;
  refund_amount: number | null;
  status: string;
  disposition: string | null;
  return_date: string | null;
}

interface ReimbursementItem {
  id: string;
  products: { name: string; sku: string } | null;
  reimbursement_type: string;
  quantity: number;
  amount: number;
  status: string;
  issue_date: string | null;
}

const RETURN_REASONS: Record<string, string> = {
  defective: "Defectuoso",
  damaged_by_carrier: "Da\u00F1ado por carrier",
  customer_damaged: "Da\u00F1ado por cliente",
  different_from_description: "Diferente a descripci\u00F3n",
  expired_item: "Vencido",
  fraud: "Fraude",
  missing_parts: "Faltan partes",
  no_longer_wanted: "Ya no lo quiere",
  not_as_described: "No como se describe",
  ordered_wrong_item: "Orden\u00F3 mal",
  quality_not_acceptable: "Calidad baja",
  arrived_late: "Lleg\u00F3 tarde",
  undeliverable: "No entregable",
  unauthorized_purchase: "Compra no autorizada",
  other: "Otro",
};

const RETURN_STATUS: Record<string, string> = {
  requested: "Solicitado",
  received_at_customer: "En cliente",
  in_transit: "En tr\u00E1nsito",
  received_at_fc: "En FC",
  inspected: "Inspeccionado",
  refunded: "Reembolsado",
  reimbursed: "Reembolsado Amazon",
  disposed: "Desechado",
};

const REIMB_TYPES: Record<string, string> = {
  lost_inbound: "Perdido inbound",
  damaged_inbound: "Da\u00F1ado inbound",
  lost_warehouse: "Perdido warehouse",
  damaged_warehouse: "Da\u00F1ado warehouse",
  customer_return: "Devoluci\u00F3n cliente",
  removal_order: "Removal order",
  other: "Otro",
};

const REIMB_STATUS: Record<string, string> = {
  pending: "Pendiente",
  submitted: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
  paid: "Pagado",
};

export default function ReturnsPage() {
  const [tab, setTab] = useState<Tab>("returns");
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      quantity: 1,
      return_reason: "other",
      refund_amount: 0,
      status: "requested",
      return_date: new Date().toISOString().split("T")[0],
    },
  });

  const watchedReason = watch("return_reason");
  const watchedStatus = watch("status");
  const watchedProduct = watch("product_id");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rRes, reRes, pRes] = await Promise.all([
        fetch("/api/returns"),
        fetch("/api/reimbursements"),
        fetch("/api/products?page=1&perPage=200"),
      ]);
      if (rRes.ok) setReturns(await rRes.json());
      if (reRes.ok) setReimbursements(await reRes.json());
      if (pRes.ok) {
        const pData = await pRes.json();
        const list = Array.isArray(pData) ? pData : pData.data || [];
        setProducts(
          list.map((p: { id: string; name: string; sku: string }) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
          }))
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ReturnFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al registrar");
      }
      const newItem = await res.json();
      setReturns((p) => [newItem, ...p]);
      setShowForm(false);
      reset({
        product_id: "",
        quantity: 1,
        return_reason: "other",
        refund_amount: 0,
        status: "requested",
        return_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Devoluci\u00F3n registrada");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al registrar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const totalRefund = returns.reduce((s, r) => s + (r.refund_amount || 0), 0);
  const totalReimb = reimbursements
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);
  const pendingReimb = reimbursements
    .filter((r) => r.status === "pending" || r.status === "submitted")
    .reduce((s, r) => s + r.amount, 0);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="POST-VENTA"
        title="Devoluciones y Reembolsos"
        subtitle="Trackea returns de clientes y reclama reembolsos a Amazon"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Devoluciones y Reembolsos" },
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total Returns
          </p>
          <p className="text-2xl font-display font-bold text-foreground">
            {returns.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {fmt(totalRefund)} en reembolsos
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Reembolsos Pagados
          </p>
          <p className="text-2xl font-display font-bold text-green-600 dark:text-emerald-400">
            {fmt(totalReimb)}
          </p>
          <p className="text-xs text-muted-foreground">
            {reimbursements.filter((r) => r.status === "paid").length}{" "}
            aprobados
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pendientes de Cobro
          </p>
          <p className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400">
            {fmt(pendingReimb)}
          </p>
          <p className="text-xs text-muted-foreground">
            {
              reimbursements.filter(
                (r) => r.status === "pending" || r.status === "submitted"
              ).length
            }{" "}
            abiertos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("returns")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "returns"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Devoluciones ({returns.length})
          </span>
        </button>
        <button
          onClick={() => setTab("reimbursements")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "reimbursements"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Reembolsos ({reimbursements.length})
          </span>
        </button>
      </div>

      {/* Quick add */}
      {tab === "returns" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {showForm ? "Cancelar" : "Registrar Devoluci\u00F3n"}
          </Button>

          {showForm && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border"
            >
              <div>
                <Label className="text-xs text-muted-foreground">
                  Producto *
                </Label>
                <Select
                  value={watchedProduct || ""}
                  onValueChange={(v) =>
                    setValue("product_id", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="h-9 bg-background border-border text-sm">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 && (
                      <SelectItem value="" disabled>
                        Sin productos
                      </SelectItem>
                    )}
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.product_id && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.product_id.message}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Cantidad *
                </Label>
                <Input
                  type="number"
                  {...register("quantity", { valueAsNumber: true })}
                  className="h-9 bg-background border-border text-sm"
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.quantity.message}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Motivo</Label>
                <Select
                  value={watchedReason}
                  onValueChange={(v) =>
                    setValue("return_reason", v as ReturnFormData["return_reason"])
                  }
                >
                  <SelectTrigger className="h-9 bg-background border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RETURN_REASONS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Reembolso ($)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("refund_amount", { valueAsNumber: true })}
                  className="h-9 bg-background border-border text-sm"
                />
                {errors.refund_amount && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.refund_amount.message}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha</Label>
                <Input
                  type="date"
                  {...register("return_date")}
                  className="h-9 bg-background border-border text-sm"
                />
                {errors.return_date && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.return_date.message}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select
                  value={watchedStatus}
                  onValueChange={(v) =>
                    setValue("status", v as ReturnFormData["status"])
                  }
                >
                  <SelectTrigger className="h-9 bg-background border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RETURN_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" disabled={saving} size="sm">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Table */}
      {tab === "returns" ? (
        <DataTableWrapper title="Devoluciones" icon={RotateCcw}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Producto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Motivo
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Cant
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Reembolso
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {returns.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {r.products?.name || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {RETURN_REASONS[r.return_reason || "other"] ||
                        r.return_reason}
                    </td>
                    <td className="px-4 py-3 text-right font-display">
                      {r.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-display text-red-600 dark:text-rose-400">
                      {fmt(r.refund_amount || 0)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {RETURN_STATUS[r.status] || r.status}
                    </td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      Sin devoluciones registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DataTableWrapper>
      ) : (
        <DataTableWrapper title="Reembolsos Amazon" icon={ShieldCheck}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Producto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Tipo
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Cant
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Monto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {reimbursements.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {r.products?.name || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {REIMB_TYPES[r.reimbursement_type] ||
                        r.reimbursement_type}
                    </td>
                    <td className="px-4 py-3 text-right font-display">
                      {r.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-display text-green-600 dark:text-emerald-400">
                      {fmt(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {REIMB_STATUS[r.status] || r.status}
                    </td>
                  </tr>
                ))}
                {reimbursements.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      Sin reembolsos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DataTableWrapper>
      )}
    </div>
  );
}
