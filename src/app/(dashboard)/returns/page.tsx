"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { returnSchema, type ReturnFormData } from "@/validations/return";
import { t } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PaginationControl } from "@/components/ui/pagination-control";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
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

function RETURN_REASONS(locale: Locale): Record<string, string> {
  return {
    defective: t("returns.reason_defective", locale),
    damaged_by_carrier: t("returns.reason_damaged_by_carrier", locale),
    customer_damaged: t("returns.reason_customer_damaged", locale),
    different_from_description: t("returns.reason_different_from_description", locale),
    expired_item: t("returns.reason_expired_item", locale),
    fraud: t("returns.reason_fraud", locale),
    missing_parts: t("returns.reason_missing_parts", locale),
    no_longer_wanted: t("returns.reason_no_longer_wanted", locale),
    not_as_described: t("returns.reason_not_as_described", locale),
    ordered_wrong_item: t("returns.reason_ordered_wrong_item", locale),
    quality_not_acceptable: t("returns.reason_quality_not_acceptable", locale),
    arrived_late: t("returns.reason_arrived_late", locale),
    undeliverable: t("returns.reason_undeliverable", locale),
    unauthorized_purchase: t("returns.reason_unauthorized_purchase", locale),
    other: t("returns.reason_other", locale),
  };
}

function RETURN_STATUS(locale: Locale): Record<string, string> {
  return {
    requested: t("returns.status_requested", locale),
    received_at_customer: t("returns.status_received_at_customer", locale),
    in_transit: t("returns.status_in_transit", locale),
    received_at_fc: t("returns.status_received_at_fc", locale),
    inspected: t("returns.status_inspected", locale),
    refunded: t("returns.status_refunded", locale),
    reimbursed: t("returns.status_reimbursed", locale),
    disposed: t("returns.status_disposed", locale),
  };
}

function REIMB_TYPES(locale: Locale): Record<string, string> {
  return {
    lost_inbound: t("returns.reimb_lost_inbound", locale),
    damaged_inbound: t("returns.reimb_damaged_inbound", locale),
    lost_warehouse: t("returns.reimb_lost_warehouse", locale),
    damaged_warehouse: t("returns.reimb_damaged_warehouse", locale),
    customer_return: t("returns.reimb_customer_return", locale),
    removal_order: t("returns.reimb_removal_order", locale),
    other: t("returns.reimb_other", locale),
  };
}

function REIMB_STATUS(locale: Locale): Record<string, string> {
  return {
    pending: t("returns.reimb_status_pending", locale),
    submitted: t("returns.reimb_status_submitted", locale),
    approved: t("returns.reimb_status_approved", locale),
    rejected: t("returns.reimb_status_rejected", locale),
    paid: t("returns.reimb_status_paid", locale),
  };
}

export default function ReturnsPage() {
  const { locale } = useLocale();
  const [tab, setTab] = useState<Tab>("returns");
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

  const returnReasons = useMemo(() => RETURN_REASONS(locale), [locale]);
  const returnStatuses = useMemo(() => RETURN_STATUS(locale), [locale]);
  const reimbTypes = useMemo(() => REIMB_TYPES(locale), [locale]);
  const reimbStatuses = useMemo(() => REIMB_STATUS(locale), [locale]);

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

  useEffect(() => { setCurrentPage(1); }, [tab]);

  const fetchData = async () => {
    try {
      const [rRes, reRes, pRes] = await Promise.all([
        fetch("/api/returns"),
        fetch("/api/reimbursements"),
        fetch("/api/products?page=1&perPage=200"),
      ]);
      if (rRes.ok) { const rData = await rRes.json(); setReturns(rData.data || []); }
      if (reRes.ok) { const reData = await reRes.json(); setReimbursements(reData.data || []); }
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
        throw new Error(err.error || t("returns.error_register", locale));
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
      toast.success(t("returns.registered", locale));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("returns.error_register", locale);
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

  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return returns.slice(start, start + ITEMS_PER_PAGE);
  }, [returns, currentPage, ITEMS_PER_PAGE]);

  const paginatedReimbursements = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return reimbursements.slice(start, start + ITEMS_PER_PAGE);
  }, [reimbursements, currentPage, ITEMS_PER_PAGE]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("badge.returns", locale)}
        title={t("returns.page_title", locale)}
        subtitle={t("returns.subtitle", locale)}
        breadcrumbs={[
          { label: t("nav.dashboard", locale), href: "/dashboard" },
          { label: t("returns.breadcrumb", locale) },
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("returns.kpi_total_returns", locale)}
          </p>
          <p className="text-2xl font-display font-bold text-foreground">
            {returns.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {fmt(totalRefund)} {t("returns.kpi_in_refunds", locale)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("returns.kpi_paid_reimbursements", locale)}
          </p>
          <p className="text-2xl font-display font-bold text-green-600 dark:text-emerald-400">
            {fmt(totalReimb)}
          </p>
          <p className="text-xs text-muted-foreground">
            {reimbursements.filter((r) => r.status === "paid").length}{" "}
            {t("returns.kpi_approved", locale)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("returns.kpi_pending_collection", locale)}
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
            {t("returns.kpi_open", locale)}
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
            {t("returns.tab_returns", locale)} ({returns.length})
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
            {t("returns.tab_reimbursements", locale)} ({reimbursements.length})
          </span>
        </button>
      </div>

      {/* Quick add */}
      {tab === "returns" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 me-1.5" />
            {showForm ? t("common.cancel", locale) : t("returns.register", locale)}
          </Button>

          {showForm && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border"
            >
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t("returns.product_required", locale)}
                </Label>
                <Select
                  value={watchedProduct || ""}
                  onValueChange={(v) =>
                    setValue("product_id", v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="h-9 bg-background border-border text-sm">
                    <SelectValue placeholder={t("returns.select_product", locale)} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 && (
                      <SelectItem value="" disabled>
                        {t("returns.no_products", locale)}
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
                  {t("returns.quantity_required", locale)}
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
                <Label className="text-xs text-muted-foreground">{t("returns.reason", locale)}</Label>
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
                    {Object.entries(returnReasons).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t("returns.refund_amount", locale)}
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
                <Label className="text-xs text-muted-foreground">{t("common.date", locale)}</Label>
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
                <Label className="text-xs text-muted-foreground">{t("common.status", locale)}</Label>
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
                    {Object.entries(returnStatuses).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" disabled={saving} size="default">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("returns.save", locale)
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Table */}
      {tab === "returns" ? (
        <DataTableWrapper title={t("returns.table_title_returns", locale)} icon={RotateCcw}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("common.product", locale)}
                  </th>
                  <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("returns.reason_header", locale)}
                  </th>
                  <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("returns.qty_header", locale)}
                  </th>
                  <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("returns.refund_header", locale)}
                  </th>
                  <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("common.status", locale)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedReturns.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {r.products?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {returnReasons[r.return_reason || "other"] ||
                        r.return_reason}
                    </td>
                    <td className="px-4 py-3 text-end font-display">
                      {r.quantity}
                    </td>
                    <td className="px-4 py-3 text-end font-display text-red-600 dark:text-rose-400">
                      {fmt(r.refund_amount || 0)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {returnStatuses[r.status] || r.status}
                    </td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      {t("returns.empty_returns", locale)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {returns.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-border">
              <PaginationControl
                currentPage={currentPage}
                totalPages={Math.ceil(returns.length / ITEMS_PER_PAGE)}
                totalItems={returns.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </DataTableWrapper>
      ) : (
        <DataTableWrapper title={t("returns.table_title_reimbursements", locale)} icon={ShieldCheck}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("common.product", locale)}
                  </th>
                  <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("returns.type_header", locale)}
                  </th>
                  <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("returns.qty_header", locale)}
                  </th>
                  <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("returns.amount_header", locale)}
                  </th>
                  <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    {t("common.status", locale)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedReimbursements.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {r.products?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {reimbTypes[r.reimbursement_type] ||
                        r.reimbursement_type}
                    </td>
                    <td className="px-4 py-3 text-end font-display">
                      {r.quantity}
                    </td>
                    <td className="px-4 py-3 text-end font-display text-green-600 dark:text-emerald-400">
                      {fmt(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {reimbStatuses[r.status] || r.status}
                    </td>
                  </tr>
                ))}
                {reimbursements.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      {t("returns.empty_reimbursements", locale)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {reimbursements.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-border">
              <PaginationControl
                currentPage={currentPage}
                totalPages={Math.ceil(reimbursements.length / ITEMS_PER_PAGE)}
                totalItems={reimbursements.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </DataTableWrapper>
      )}
    </div>
  );
}
