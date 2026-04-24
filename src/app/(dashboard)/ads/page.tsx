"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { campaignSchema, type CampaignFormData } from "@/validations/campaign";
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
import { Target, Plus, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

const STATUS_STYLES: Record<string, string> = {
  enabled: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function AdsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      campaign_name: "",
      campaign_type: "sp_auto",
      marketplace: "US",
      status: "enabled",
      daily_budget: 0,
    },
  });

  const watchedType = watch("campaign_type");

  useEffect(() => {
    fetch("/api/ppc-campaigns")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setCampaigns(list);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Error cargando campa\u00F1as");
        setLoading(false);
      });
  }, []);

  const onSubmit = async (formData: CampaignFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/ppc-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Error");
      const newCamp = await res.json();
      setCampaigns((p) => [newCamp, ...p]);
      setShowForm(false);
      reset();
      toast.success("Campa\u00F1a creada");
    } catch {
      toast.error("Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const totalBudget = campaigns.reduce((s, c) => s + (c.daily_budget || 0), 0);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="ADS"
        title="Amazon PPC"
        subtitle="Gesti\u00F3n de campa\u00F1as publicitarias"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Amazon PPC" }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Campa\u00F1as</p>
          <p className="text-2xl font-display font-bold text-foreground">{campaigns.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget Diario Total</p>
          <p className="text-2xl font-display font-bold text-foreground">${totalBudget.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activas</p>
          <p className="text-2xl font-display font-bold text-emerald-500">
            {campaigns.filter((c) => c.status === "enabled").length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {showForm ? "Cancelar" : "Nueva Campa\u00F1a"}
        </Button>

        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border"
          >
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nombre *</Label>
              <Input
                {...register("campaign_name")}
                placeholder="Ej: SP Auto - Kitchen Set"
                className="h-9 bg-background border-border text-sm"
              />
              {errors.campaign_name && (
                <p className="text-xs text-destructive mt-1">{errors.campaign_name.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={watchedType}
                onValueChange={(v) => setValue("campaign_type", v as CampaignFormData["campaign_type"])}
              >
                <SelectTrigger className="h-9 bg-background border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Budget diario ($)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("daily_budget", { valueAsNumber: true })}
                className="h-9 bg-background border-border text-sm"
              />
              {errors.daily_budget && (
                <p className="text-xs text-destructive mt-1">{errors.daily_budget.message}</p>
              )}
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <DataTableWrapper title="Campa\u00F1as" icon={Target}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Budget/d\u00EDa
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Marketplace
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c.campaign_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {CAMPAIGN_TYPES[c.campaign_type] || c.campaign_type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        STATUS_STYLES[c.status] || STATUS_STYLES.archived
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-display">${c.daily_budget.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.marketplace}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Sin campa\u00F1as registradas
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
