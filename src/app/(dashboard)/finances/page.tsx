"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormData } from "@/validations/expense";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
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

const EXPENSE_CATEGORIES = [
  { value: "ppc", label: "PPC / Ads" },
  { value: "software", label: "Software" },
  { value: "va_services", label: "VA / Servicios" },
  { value: "samples", label: "Muestras" },
  { value: "photography", label: "Fotografia" },
  { value: "shipping_forwarder", label: "Forwarder" },
  { value: "customs", label: "Aduana" },
  { value: "prep_center", label: "Prep Center" },
  { value: "storage_3pl", label: "Storage 3PL" },
  { value: "travel", label: "Viajes" },
  { value: "other", label: "Otros" },
];

export default function FinancesPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [savingExpense, setSavingExpense] = useState(false);

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
        toast.error("Error al cargar datos financieros");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
        throw new Error(err.error || "Error al registrar gasto");
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
      toast.success("Gasto registrado");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al registrar gasto";
      toast.error(message);
    } finally {
      setSavingExpense(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="FINANZAS"
        title="Cash Flow"
        subtitle="Controla tus ingresos, gastos y rentabilidad real del negocio"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Finanzas" }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos Amazon"
          value={fmt(totalPayouts)}
          icon={DollarSign}
          trend="up"
          trendValue={`${payouts.length} payouts`}
          accentColor="green"
        />
        <KpiCard
          label="Gastos Totales"
          value={fmt(totalExpenses)}
          icon={TrendingDown}
          trend="down"
          trendValue={`${expenses.length} gastos`}
          accentColor="red"
        />
        <KpiCard
          label="Net Profit"
          value={fmt(netProfit)}
          icon={Wallet}
          trend={netProfit >= 0 ? "up" : "down"}
          trendValue={netProfit >= 0 ? "Positivo" : "Negativo"}
          accentColor={netProfit >= 0 ? "green" : "red"}
        />
        <KpiCard
          label="Margen Neto"
          value={totalPayouts > 0 ? ((netProfit / totalPayouts) * 100).toFixed(1) + "%" : "0%"}
          icon={PiggyBank}
          trend={netProfit >= 0 ? "up" : "down"}
          accentColor={netProfit >= 0 ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly table */}
        <div className="lg:col-span-2">
          <DataTableWrapper title="Resumen Mensual" icon={Calendar}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ingresos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gastos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {monthly.map((m) => (
                    <tr key={m.month} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{m.month}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-emerald-400 font-display">{fmt(m.payouts)}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-rose-400 font-display">{fmt(m.expenses)}</td>
                      <td className={`px-4 py-3 text-right font-display font-bold ${m.net >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-rose-400"}`}>
                        {fmt(m.net)}
                      </td>
                    </tr>
                  ))}
                  {monthly.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        Sin datos financieros registrados. Agrega payouts y gastos para ver el resumen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        </div>

        {/* Sidebar: Add expense + Category breakdown */}
        <div className="space-y-4">
          {/* Add expense */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Registrar Gasto</span>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select
                  value={watchedCategory}
                  onValueChange={(v) => setValue("category", v as ExpenseFormData["category"])}
                >
                  <SelectTrigger className="h-9 bg-background border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descripcion *</Label>
                <Input
                  {...register("description")}
                  placeholder="Ej: Subscription Helium 10"
                  className="h-9 bg-background border-border text-sm"
                />
                {errors.description && (
                  <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Monto ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("amount", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="h-9 bg-background border-border text-sm"
                  />
                  {errors.amount && (
                    <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha *</Label>
                  <Input
                    type="date"
                    {...register("expense_date")}
                    className="h-9 bg-background border-border text-sm"
                  />
                  {errors.expense_date && (
                    <p className="text-xs text-destructive mt-1">{errors.expense_date.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Proveedor (opcional)</Label>
                <Input
                  {...register("vendor")}
                  placeholder="Ej: Helium 10"
                  className="h-9 bg-background border-border text-sm"
                />
              </div>
              <Button type="submit" disabled={savingExpense} className="w-full" size="sm">
                {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Registrar gasto
              </Button>
            </form>
          </div>

          {/* Category breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Gastos por Categoria</span>
            </div>
            <div className="space-y-2">
              {expensesByCategory.map((c) => {
                const catLabel = EXPENSE_CATEGORIES.find((e) => e.value === c.category)?.label || c.category;
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
                <p className="text-xs text-muted-foreground text-center py-4">Sin gastos registrados</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent expenses table */}
      <DataTableWrapper title="Gastos Recientes" icon={Receipt}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripcion</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proveedor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {expenses.slice(0, 20).map((e) => {
                const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || e.category;
                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{e.expense_date}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.category} />
                    </td>
                    <td className="px-4 py-3 text-foreground">{e.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.vendor || "\u2014"}</td>
                    <td className="px-4 py-3 text-right font-display text-red-600 dark:text-rose-400">{fmt(e.amount)}</td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No hay gastos registrados. Usa el formulario de la derecha para agregar uno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableWrapper>
    </div>
  );
}
