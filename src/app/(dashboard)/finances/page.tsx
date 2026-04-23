"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
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
  const [expenseForm, setExpenseForm] = useState({
    category: "other",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    vendor: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expRes, payRes] = await Promise.all([
          fetch("/api/expenses"),
          fetch("/api/amazon-payouts"),
        ]);
        if (expRes.ok) setExpenses(await expRes.json());
        if (payRes.ok) setPayouts(await payRes.json());
      } catch (error) {
        console.error("Error cargando finanzas:", error);
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

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error("Descripcion y monto son requeridos");
      return;
    }
    setSavingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseForm.category,
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          expense_date: expenseForm.expense_date,
          vendor: expenseForm.vendor || null,
        }),
      });
      if (!res.ok) throw new Error("Error");
      const newExp = await res.json();
      setExpenses((p) => [newExp, ...p]);
      setExpenseForm({
        category: "other",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        vendor: "",
      });
      toast.success("Gasto registrado");
    } catch {
      toast.error("Error al registrar gasto");
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
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-9 bg-muted/50 border-border text-sm">
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
                <Label className="text-xs text-muted-foreground">Descripcion</Label>
                <Input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: Subscription Helium 10"
                  className="h-9 bg-muted/50 border-border text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Monto ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00"
                    className="h-9 bg-muted/50 border-border text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha</Label>
                  <Input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, expense_date: e.target.value }))}
                    className="h-9 bg-muted/50 border-border text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Proveedor (opcional)</Label>
                <Input
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, vendor: e.target.value }))}
                  placeholder="Ej: Helium 10"
                  className="h-9 bg-muted/50 border-border text-sm"
                />
              </div>
              <button
                onClick={handleAddExpense}
                disabled={savingExpense}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Registrar gasto
              </button>
            </div>
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
                    <td className="px-4 py-3 text-muted-foreground">{e.vendor || "—"}</td>
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
