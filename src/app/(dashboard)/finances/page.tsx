"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormData } from "@/validations/expense";
import { t } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PaginationControl } from "@/components/ui/pagination-control";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fmt } from "@/lib/utils";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  Receipt,
  Plus,
  Calendar,
  Loader2,
} from "lucide-react";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  recurring: boolean;
  vendor: string | null;
}

interface Payout {
  id: string;
  payout_period_start: string;
  payout_period_end: string;
  amount: number;
  status: string;
  marketplace: string;
}

interface MonthlyData {
  month: string;
  expenses: number;
  payouts: number;
  net: number;
}

function EXPENSE_CATEGORIES(locale: Locale) {
  return [
    { value: "ppc", label: t("finances.cat_ppc", locale) },
    { value: "software", label: t("finances.cat_software", locale) },
    { value: "va_services", label: t("finances.cat_va_services", locale) },
    { value: "samples", label: t("finances.cat_samples", locale) },
    { value: "photography", label: t("finances.cat_photography", locale) },
    { value: "shipping_forwarder", label: t("finances.cat_shipping_forwarder", locale) },
    { value: "customs", label: t("finances.cat_customs", locale) },
    { value: "prep_center", label: t("finances.cat_prep_center", locale) },
    { value: "storage_3pl", label: t("finances.cat_storage_3pl", locale) },
    { value: "travel", label: t("finances.cat_travel", locale) },
    { value: "other", label: t("finances.cat_other", locale) },
  ];
}

export default function FinancesPage() {
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expensePage, setExpensePage] = useState(1);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const EXPENSES_PER_PAGE = DEFAULT_PAGE_SIZE;
  const categories = useMemo(() => EXPENSE_CATEGORIES(locale), [locale]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "other",
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().split("T")[0],
      vendor: "",
    },
  });

  const watchedCategory = watch("category");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expRes, payRes] = await Promise.all([
          fetch("/api/expenses"),
          fetch("/api/amazon-payouts"),
        ]);
        if (expRes.ok) {
          const expData = await expRes.json();
          setExpenses(Array.isArray(expData) ? expData : expData.data || []);
        }
        if (payRes.ok) {
          const payData = await payRes.json();
          setPayouts(Array.isArray(payData) ? payData : payData.data || []);
        }
      } catch (error) {
        toast.error(t("finances.error_load_data", locale));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [locale]);

  const monthly = useMemo(() => {
    const map = new Map<string, MonthlyData>();
    expenses.forEach((e) => {
      const m = e.expense_date.slice(0, 7);
      const d = map.get(m) || { month: m, expenses: 0, payouts: 0, net: 0 };
      d.expenses += e.amount;
      map.set(m, d);
    });
    payouts.forEach((p) => {
      const m = p.payout_period_start.slice(0, 7);
      const d = map.get(m) || { month: m, expenses: 0, payouts: 0, net: 0 };
      d.payouts += p.amount;
      map.set(m, d);
    });
    return Array.from(map.values())
      .map((d) => ({ ...d, net: d.payouts - d.expenses }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);
  }, [expenses, payouts]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);
  const netProfit = totalPayouts - totalExpenses;

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const onSubmit = async (data: ExpenseFormData) => {
    setSavingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("finances.error_register", locale));
      }
      const newExp = await res.json();
      setExpenses((p) => [newExp, ...p]);
      reset({
        category: "other",
        description: "",
        amount: 0,
        expense_date: new Date().toISOString().split("T")[0],
        vendor: "",
      });
      setShowExpenseModal(false);
      toast.success(t("finances.expense_registered", locale));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("finances.error_register", locale);
      toast.error(message);
    } finally {
      setSavingExpense(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("badge.finances", locale)}
        title={t("finances.title", locale)}
        subtitle={t("finances.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.finances", locale) }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("finances.kpi_amazon_income", locale)}
          value={fmt(totalPayouts)}
          icon={DollarSign}
          trend="up"
          trendValue={`${payouts.length} ${t("finances.payouts", locale)}`}
          accentColor="green"
        />
        <KpiCard
          label={t("finances.kpi_total_expenses", locale)}
          value={fmt(totalExpenses)}
          icon={TrendingDown}
          trend="down"
          trendValue={`${expenses.length} ${t("finances.expenses_word", locale)}`}
          accentColor="red"
        />
        <KpiCard
          label={t("finances.kpi_net_profit", locale)}
          value={fmt(netProfit)}
          icon={Wallet}
          trend={netProfit >= 0 ? "up" : "down"}
          trendValue={netProfit >= 0 ? t("common.positive", locale) : t("common.negative", locale)}
          accentColor={netProfit >= 0 ? "green" : "red"}
        />
        <KpiCard
          label={t("finances.kpi_net_margin", locale)}
          value={totalPayouts > 0 ? ((netProfit / totalPayouts) * 100).toFixed(1) + "%" : "0%"}
          icon={PiggyBank}
          trend={netProfit >= 0 ? "up" : "down"}
          accentColor={netProfit >= 0 ? "green" : "red"}
        />
      </div>

      {/* Main layout: left (stacked) + right (sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Monthly summary + Recent expenses stacked */}
        <div className="lg:col-span-2 space-y-4">
          {/* Monthly summary */}
          <DataTableWrapper title={t("finances.monthly_summary", locale)} icon={Calendar}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("finances.month", locale)}</th>
                    <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("finances.income", locale)}</th>
                    <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("finances.expenses", locale)}</th>
                    <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("finances.net", locale)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {monthly.map((m) => (
                    <tr key={m.month} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{m.month}</td>
                      <td className="px-4 py-3 text-end text-green-600 dark:text-emerald-400 font-display">{fmt(m.payouts)}</td>
                      <td className="px-4 py-3 text-end text-red-600 dark:text-rose-400 font-display">{fmt(m.expenses)}</td>
                      <td className={`px-4 py-3 text-end font-display font-bold ${m.net >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-rose-400"}`}>
                        {fmt(m.net)}
                      </td>
                    </tr>
                  ))}
                  {monthly.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        {t("finances.empty_monthly", locale)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>

          {/* Recent expenses */}
          <DataTableWrapper title={t("finances.recent_expenses", locale)} icon={Receipt}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("common.date", locale)}</th>
                    <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("finances.category", locale)}</th>
                    <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("common.product", locale)}</th>
                    <th scope="col" className="text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("finances.vendor", locale)}</th>
                    <th scope="col" className="text-end px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("finances.amount", locale)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {expenses.slice((expensePage - 1) * EXPENSES_PER_PAGE, expensePage * EXPENSES_PER_PAGE).map((e) => {
                    const catLabel = categories.find((c) => c.value === e.category)?.label || e.category;
                    return (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{e.expense_date}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={e.category} />
                        </td>
                        <td className="px-4 py-3 text-foreground">{e.description}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.vendor || "—"}</td>
                        <td className="px-4 py-3 text-end font-display text-red-600 dark:text-rose-400">{fmt(e.amount)}</td>
                      </tr>
                    );
                  })}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        {t("finances.empty_expenses", locale)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {expenses.length > EXPENSES_PER_PAGE && (
              <div className="p-4 border-t border-border">
                <PaginationControl
                  currentPage={expensePage}
                  totalPages={Math.ceil(expenses.length / EXPENSES_PER_PAGE)}
                  totalItems={expenses.length}
                  itemsPerPage={EXPENSES_PER_PAGE}
                  onPageChange={setExpensePage}
                />
              </div>
            )}
          </DataTableWrapper>
        </div>

        {/* RIGHT: Category breakdown (fixed) + Add expense button */}
        <div className="space-y-4">
          {/* Add expense button */}
          <Button
            onClick={() => setShowExpenseModal(true)}
            className="w-full"
            size="default"
          >
            <Plus className="h-4 w-4 me-1.5" />
            {t("finances.register_expense", locale)}
          </Button>

          {/* Category breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 sticky top-20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">{t("finances.expenses_by_category", locale)}</span>
            </div>
            <div className="space-y-2">
              {expensesByCategory.map((c) => {
                const catLabel = categories.find((e) => e.value === c.category)?.label || c.category;
                const pct = totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{catLabel}</span>
                      <span className="font-display text-foreground">{fmt(c.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {expensesByCategory.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">{t("finances.no_expenses", locale)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              {t("finances.register_expense", locale)}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="modal-expense-category" className="text-xs text-muted-foreground">{t("finances.category", locale)}</Label>
              <Select
                value={watchedCategory}
                onValueChange={(v) => setValue("category", v as ExpenseFormData["category"])}
              >
                <SelectTrigger id="modal-expense-category" className="h-9 bg-background border-border text-sm mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="modal-expense-description" className="text-xs text-muted-foreground">{t("finances.description_required", locale)}</Label>
              <Input
                id="modal-expense-description"
                {...register("description")}
                placeholder={t("finances.description_placeholder", locale)}
                className="h-9 bg-background border-border text-sm mt-1.5"
              />
              {errors.description && (
                <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="modal-expense-amount" className="text-xs text-muted-foreground">{t("finances.amount_required", locale)}</Label>
                <Input
                  id="modal-expense-amount"
                  type="number"
                  step="0.01"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="h-9 bg-background border-border text-sm mt-1.5"
                />
                {errors.amount && (
                  <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="modal-expense-date" className="text-xs text-muted-foreground">{t("finances.date_required", locale)}</Label>
                <Input
                  id="modal-expense-date"
                  type="date"
                  {...register("expense_date")}
                  className="h-9 bg-background border-border text-sm mt-1.5"
                />
                {errors.expense_date && (
                  <p className="text-xs text-destructive mt-1">{errors.expense_date.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="modal-expense-vendor" className="text-xs text-muted-foreground">{t("finances.vendor_optional", locale)}</Label>
              <Input
                id="modal-expense-vendor"
                {...register("vendor")}
                placeholder={t("finances.vendor_placeholder", locale)}
                className="h-9 bg-background border-border text-sm mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExpenseModal(false)}
              >
                {t("common.cancel", locale)}
              </Button>
              <Button type="submit" disabled={savingExpense}>
                {savingExpense ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Plus className="h-4 w-4 me-1.5" />}
                {t("finances.save_expense", locale)}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
