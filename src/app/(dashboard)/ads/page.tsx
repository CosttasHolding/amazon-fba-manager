"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Target, Plus, Loader2, TrendingUp } from "lucide-react";

interface Campaign {
  id: string;
  campaign_name: string;
  campaign_type: string;
  status: string;
  daily_budget: number;
  marketplace: string;
}

const CAMPAIGN_TYPES: Record<string, string> = {
  sp_auto: "Sponsored Products Auto",
  sp_manual_keyword: "SP Manual - Keyword",
  sp_manual_product: "SP Manual - Product",
  sb: "Sponsored Brands",
  sd: "Sponsored Display",
};

export default function AdsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ campaign_name: "", campaign_type: "sp_auto", daily_budget: "", marketplace: "US" });

  useEffect(() => {
    fetch("/api/ppc-campaigns")
      .then((r) => r.json())
      .then((data) => { setCampaigns(data); setLoading(false); })
      .catch(() => { toast.error("Error cargando campanas"); setLoading(false); });
  }, []);

  const handleSubmit = async () => {
    if (!form.campaign_name) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ppc-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, daily_budget: parseFloat(form.daily_budget) || 0 }),
      });
      if (!res.ok) throw new Error("Error");
      const newCamp = await res.json();
      setCampaigns((p) => [newCamp, ...p]);
      setShowForm(false);
      setForm({ campaign_name: "", campaign_type: "sp_auto", daily_budget: "", marketplace: "US" });
      toast.success("Campana creada");
    } catch { toast.error("Error al crear"); }
    finally { setSaving(false); }
  };

  const totalBudget = campaigns.reduce((s, c) => s + (c.daily_budget || 0), 0);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader badge="ADS" title="Amazon PPC" subtitle="Gestion de campanas publicitarias" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Campanas</p>
          <p className="text-2xl font-display font-bold text-foreground">{campaigns.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget Diario Total</p>
          <p className="text-2xl font-display font-bold text-foreground">${totalBudget.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activas</p>
          <p className="text-2xl font-display font-bold text-emerald-500">{campaigns.filter((c) => c.status === "enabled").length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <button onClick={() => setShowForm(!showForm)} className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? "Cancelar" : "Nueva Campana"}
        </button>
        {showForm && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input value={form.campaign_name} onChange={(e) => setForm((p) => ({ ...p, campaign_name: e.target.value }))} className="h-9 bg-muted/50 border-border text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <select value={form.campaign_type} onChange={(e) => setForm((p) => ({ ...p, campaign_type: e.target.value }))} className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm px-2">
                {Object.entries(CAMPAIGN_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Budget diario ($)</Label>
              <Input type="number" step="0.01" value={form.daily_budget} onChange={(e) => setForm((p) => ({ ...p, daily_budget: e.target.value }))} className="h-9 bg-muted/50 border-border text-sm" />
            </div>
            <div className="sm:col-span-4">
              <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
              </button>
            </div>
          </div>
        )}
      </div>

      <DataTableWrapper title="Campanas" icon={Target}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Budget/dia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Marketplace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c.campaign_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{CAMPAIGN_TYPES[c.campaign_type] || c.campaign_type}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-display">${c.daily_budget.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.marketplace}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Sin campanas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableWrapper>
    </div>
  );
}
