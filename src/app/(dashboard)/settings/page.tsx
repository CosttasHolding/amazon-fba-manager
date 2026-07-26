"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Settings,
  User,
  Package,
  Calculator,
  Save,
  Loader2,
  Download,
  Upload,
  FileText,
  Building2,
  Globe,
  MapPin,
  DollarSign,
  Percent,
  Truck,
  Warehouse,
  Target,
  Coins,
  Receipt,
  ShoppingCart,
  BarChart3,
  BoxesIcon,
  Tags,
  Bell,
  BellRing,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { PushToggle } from "@/components/push-toggle";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-context";
import { t, getLanguageName } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/translations";
import { inputClass } from "@/lib/form-constants";

const TABS = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "fba", label: "FBA Defaults", icon: Package },
  { id: "calculations", label: "Cálculos", icon: Calculator },
  { id: "data", label: "Datos", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

const MARKETPLACES = [
  { value: "US", label: "Estados Unidos (US)" },
  { value: "CA", label: "Canadá (CA)" },
  { value: "MX", label: "México (MX)" },
  { value: "UK", label: "Reino Unido (UK)" },
  { value: "DE", label: "Alemania (DE)" },
  { value: "FR", label: "Francia (FR)" },
  { value: "IT", label: "Italia (IT)" },
  { value: "ES", label: "España (ES)" },
  { value: "JP", label: "Japón (JP)" },
  { value: "AU", label: "Australia (AU)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "ARS", label: "ARS ($)" },
];

interface UserSettings {
  id: string;
  full_name: string;
  company: string;
  country: string;
  marketplace: string;
  default_fba_fee: number;
  default_referral_fee: number;
  default_shipping_cost: number;
  default_storage_cost: number;
  target_roi: number;
  currency: string;
  tax_rate: number;
  avatar_url: string | null;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
  className = "",
  fieldId,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  fieldId?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />}
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [exporting, setExporting] = useState("");
  const { rates, loading: ratesLoading, fetchRates } = useExchangeRates();

  const [profile, setProfile] = useState({
    full_name: "",
    company: "",
    country: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fba, setFba] = useState({
    marketplace: "US",
    default_fba_fee: "3.00",
    default_referral_fee: "15.00",
    default_shipping_cost: "0.00",
    default_storage_cost: "0.00",
  });
  const [calc, setCalc] = useState({
    target_roi: "30.00",
    currency: "USD",
    tax_rate: "0.00",
  });

  const fetchSettings = useCallback(async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setProfile({
          full_name: data.full_name || "",
          company: data.company || "",
          country: data.country || "",
        });
        setAvatarUrl(data.avatar_url || null);
        setFba({
          marketplace: data.marketplace || "US",
          default_fba_fee: String(data.default_fba_fee ?? "3.00"),
          default_referral_fee: String(data.default_referral_fee ?? "15.00"),
          default_shipping_cost: String(data.default_shipping_cost ?? "0.00"),
          default_storage_cost: String(data.default_storage_cost ?? "0.00"),
        });
        setCalc({
          target_roi: String(data.target_roi ?? "30.00"),
          currency: data.currency || "USD",
          tax_rate: String(data.tax_rate ?? "0.00"),
        });
        if (data.language && (data.language === "es" || data.language === "en" || data.language === "ar")) {
          setLocale(data.language);
        }
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
        toast.error(t("settings.error_load", locale));
    } finally {
      setLoading(false);
    }
  }, [locale, setLocale]);

  const saveSettings = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(t("common.error_saving", locale));
      const updated = await res.json();
      setSettings(updated);
      toast.success(t("settings.save_success", locale));
    } catch {
      toast.error(t("settings.error_save_config", locale));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveProfile = async () => {
    await saveSettings(profile);
    // Also update org name if company changed
    if (profile.company) {
      try {
        const supabase = await import("@/lib/supabase/client").then(m => m.createClient());
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from("user_settings")
            .select("current_org_id")
            .eq("user_id", user.id)
            .single();
          if (settings?.current_org_id) {
            await supabase
              .from("organizations")
              .update({ name: profile.company })
              .eq("id", settings.current_org_id);
          }
        }
      } catch (e) { console.error("Failed to update org name", e); }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAvatarUrl(data.avatar_url);
      toast.success("Imagen actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };
  const handleSaveFba = () =>
    saveSettings({
      marketplace: fba.marketplace,
      default_fba_fee: parseFloat(fba.default_fba_fee) || 0,
      default_referral_fee: parseFloat(fba.default_referral_fee) || 0,
      default_shipping_cost: parseFloat(fba.default_shipping_cost) || 0,
      default_storage_cost: parseFloat(fba.default_storage_cost) || 0,
    });
  const handleSaveCalc = () =>
    saveSettings({
      target_roi: parseFloat(calc.target_roi) || 0,
      currency: calc.currency,
      tax_rate: parseFloat(calc.tax_rate) || 0,
    });

  const handleExport = async (entity: string) => {
    setExporting(entity);
    try {
      const res = await fetch(`/api/${entity}`);
      if (!res.ok) throw new Error(t("common.error_exporting", locale));
      const data = await res.json();
      const items = data.data || data || [];
      if (items.length === 0) {
        toast.error(t("settings.no_data_export", locale).replace("{entity}", entity));
        return;
      }
      const headers = Object.keys(items[0]);
      const csvRows = [headers.join(",")];
      for (const item of items) {
        const values = headers.map((h: string) => {
          const val = item[h];
          if (val === null || val === undefined) return "";
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${entity}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("settings.export_success", locale).replace("{entity}", entity));
    } catch {
      toast.error(t("settings.error_export_entity", locale).replace("{entity}", entity));
    } finally {
      setExporting("");
    }
  };

  if (loading) {
    return <PageSkeleton kpiCount={0} rowCount={6} showSearch={false} showCharts={false} />;
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <Settings className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-1">{t("settings.error_load", locale)}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("settings.error_load_hint", locale)}</p>
        </div>
        <button
          onClick={() => fetchSettings()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {t("settings.retry", locale)}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        badge={t("settings.badge", locale)}
        title={t("settings.title", locale)}
        subtitle={t("settings.subtitle", locale)}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: t("settings.title", locale) },
        ]}
      />

      {/* Tab navigation */}
      <div className="rounded-2xl border border-border bg-card p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap flex-1 justify-center ${isActive
                  ? "bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t(tab.id === "fba" ? "settings.fba_defaults" : `settings.${tab.id}`, locale)}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={User} title="Foto de perfil">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <img
                  src={avatarUrl || "/logo_solo.png"}
                  alt="Avatar"
                  loading="lazy"
                  className="w-20 h-20 rounded-2xl object-cover border border-border"
                />
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-white" />
                  )}
                </label>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Formatos: PNG, JPG, WebP. Maximo 2MB.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Hover sobre la imagen para cambiar.</p>
              </div>
            </div>
          </Section>
          <Section icon={User} title={t("settings.section_personal_info", locale)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label={t("settings.full_name", locale)} icon={User} fieldId="settings-full-name">
                <Input
                  id="settings-full-name"
                  className={inputClass}
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, full_name: e.target.value }))
                  }
                  placeholder={t("settings.placeholder_name", locale)}
                />
              </Field>
              <Field label={t("settings.company", locale)} icon={Building2} fieldId="settings-company">
                <Input
                  id="settings-company"
                  className={inputClass}
                  value={profile.company}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, company: e.target.value }))
                  }
                  placeholder={t("settings.placeholder_company", locale)}
                />
              </Field>
              <Field label={t("settings.country", locale)} icon={MapPin} fieldId="settings-country">
                <Input
                  id="settings-country"
                  className={inputClass}
                  value={profile.country}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, country: e.target.value }))
                  }
                  placeholder={t("settings.placeholder_country", locale)}
                />
              </Field>
              <Field label={t("settings.language", locale)} icon={Globe} fieldId="settings-language">
                <Select
                  value={locale}
                  onValueChange={(v) => {
                    setLocale(v as Locale);
                    saveSettings({ language: v });
                  }}
                >
                  <SelectTrigger id="settings-language" className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Save className="h-4 w-4 me-2" />
              )}
              {t("settings.save_profile", locale)}
            </Button>
          </div>
        </div>
      )}

      {/* FBA Defaults Tab */}
      {activeTab === "fba" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={Globe} title="Marketplace">
            <Field label={t("settings.amazon_marketplace", locale)} icon={Globe} fieldId="settings-marketplace">
              <Select
                value={fba.marketplace}
                onValueChange={(v) =>
                  setFba((p) => ({ ...p, marketplace: v }))
                }
              >
                <SelectTrigger id="settings-marketplace" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETPLACES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>
          <Section icon={DollarSign} title={t("settings.section_default_fees", locale)}>
            <p className="text-xs text-muted-foreground/70 -mt-2">
              {t("settings.default_fees_hint", locale)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Field label={t("settings.fba_fee", locale)} icon={DollarSign} fieldId="settings-fba-fee">
                <Input
                  id="settings-fba-fee"
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={fba.default_fba_fee}
                  onChange={(e) =>
                    setFba((p) => ({ ...p, default_fba_fee: e.target.value }))
                  }
                />
              </Field>
              <Field label={t("settings.referral_fee", locale)} icon={Percent} fieldId="settings-referral-fee">
                <Input
                  id="settings-referral-fee"
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={fba.default_referral_fee}
                  onChange={(e) =>
                    setFba((p) => ({
                      ...p,
                      default_referral_fee: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={t("settings.shipping", locale)} icon={Truck} fieldId="settings-shipping">
                <Input
                  id="settings-shipping"
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={fba.default_shipping_cost}
                  onChange={(e) =>
                    setFba((p) => ({
                      ...p,
                      default_shipping_cost: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={t("settings.storage", locale)} icon={Warehouse} fieldId="settings-storage">
                <Input
                  id="settings-storage"
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={fba.default_storage_cost}
                  onChange={(e) =>
                    setFba((p) => ({
                      ...p,
                      default_storage_cost: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          </Section>
          <div className="flex justify-end">
            <Button onClick={handleSaveFba} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Save className="h-4 w-4 me-2" />
              )}
              {t("settings.save_fba", locale)}
            </Button>
          </div>
        </div>
      )}

      {/* Calculations Tab */}
      {activeTab === "calculations" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={Calculator} title={t("settings.section_calc_params", locale)}>
            <p className="text-xs text-muted-foreground/70 -mt-2">
              {t("settings.calc_params_hint", locale)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label={t("settings.target_roi", locale)} icon={Target} fieldId="settings-target-roi">
                <Input
                  id="settings-target-roi"
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={calc.target_roi}
                  onChange={(e) =>
                    setCalc((p) => ({ ...p, target_roi: e.target.value }))
                  }
                />
              </Field>
              <Field label={t("settings.currency", locale)} icon={Coins} fieldId="settings-currency">
                <Select
                  value={calc.currency}
                  onValueChange={(v) =>
                    setCalc((p) => ({ ...p, currency: v }))
                  }
                >
                  <SelectTrigger id="settings-currency" className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("settings.tax_rate", locale)} icon={Receipt} fieldId="settings-tax-rate">
                <Input
                  id="settings-tax-rate"
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={calc.tax_rate}
                  onChange={(e) =>
                    setCalc((p) => ({ ...p, tax_rate: e.target.value }))
                  }
                />
              </Field>
            </div>
          </Section>
          <Section icon={BarChart3} title={t("settings.section_preview", locale)}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: t("settings.preview_target_roi", locale),
                  value: `${calc.target_roi}%`,
                  color: "text-green-400",
                },
                {
                  label: t("settings.currency", locale),
                  value: calc.currency,
                  color: "text-primary",
                },
                {
                  label: t("settings.preview_taxes", locale),
                  value: `${calc.tax_rate}%`,
                  color: "text-amber-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="text-center p-4 rounded-xl bg-muted/30 border border-border"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.label}
                  </p>
                  <p className={`text-lg font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Section>
          <Section icon={DollarSign} title="Tipos de cambio en tiempo real">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground/70">
                {rates?.lastUpdated
                  ? `Actualizado: ${rates.lastUpdated.toLocaleTimeString("es-AR")}`
                  : "Cargando cotizaciones..."}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRates}
                disabled={ratesLoading}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className={`h-3 w-3 me-1 ${ratesLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rates && [
                { from: "USD", to: "CNY", rate: rates.USD_CNY, flag1: "🇺🇸", flag2: "🇨🇳" },
                { from: "USD", to: "ARS", rate: rates.USD_ARS, flag1: "🇺🇸", flag2: "🇦🇷" },
                { from: "CNY", to: "ARS", rate: rates.CNY_ARS, flag1: "🇨🇳", flag2: "🇦🇷" },
              ].map((r) => (
                <div key={r.from + r.to} className="p-3 rounded-xl bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">{r.flag1} {r.from} → {r.flag2} {r.to}</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {r.rate.toFixed(r.from === "CNY" && r.to === "ARS" ? 2 : 4)}
                  </p>
                </div>
              ))}
              {!rates && (
                <div className="col-span-3 text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                </div>
              )}
            </div>
          </Section>
          <div className="flex justify-end">
            <Button onClick={handleSaveCalc} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Save className="h-4 w-4 me-2" />
              )}
              {t("settings.save_calculations", locale)}
            </Button>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === "data" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={Download} title={t("settings.section_export", locale)}>
            <p className="text-xs text-muted-foreground/70 -mt-2">
              {t("settings.export_hint", locale)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  entity: "products",
                  label: t("settings.export_products", locale),
                  icon: Tags,
                  color: "cyan",
                },
                {
                  entity: "suppliers",
                  label: t("settings.export_suppliers", locale),
                  icon: Building2,
                  color: "purple",
                },
                {
                  entity: "inventory",
                  label: t("settings.export_inventory", locale),
                  icon: BoxesIcon,
                  color: "amber",
                },
                {
                  entity: "sales",
                  label: t("settings.export_sales", locale),
                  icon: ShoppingCart,
                  color: "green",
                },
              ].map((item) => {
                const Icon = item.icon;
                const isLoading = exporting === item.entity;
                const colorMap: Record<string, string> = {
                  cyan: "border-cyan-500/20 text-cyan-500 hover:bg-cyan-500/10",
                  purple:
                    "border-purple-500/20 text-purple-500 hover:bg-purple-500/10",
                  amber:
                    "border-amber-500/20 text-amber-500 hover:bg-amber-500/10",
                  green:
                    "border-green-500/20 text-green-500 hover:bg-green-500/10",
                };
                return (
                  <button
                    key={item.entity}
                    onClick={() => handleExport(item.entity)}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-card border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${colorMap[item.color]}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    {t("settings.export_entity", locale).replace("{entity}", item.label)}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section icon={Upload} title={t("settings.section_import", locale)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-foreground font-medium">
                  {t("settings.import_title", locale)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.import_hint", locale)}
                </p>
              </div>
              <Button
                onClick={() => router.push("/import")}
                variant="outline"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {t("settings.go_to_import", locale)}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Section>

          <Section icon={Bell} title={t("settings.section_notifications", locale)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-foreground font-medium">
                  {t("settings.notifications_title", locale)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.notifications_hint", locale)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">{t("settings.active", locale)}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {[
                { label: t("settings.alert_out_of_stock", locale), color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
                { label: t("settings.alert_low_stock", locale), color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                { label: t("settings.alert_overstock", locale), color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                { label: t("settings.alert_low_margin", locale), color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
              ].map((alert) => (
                <div
                  key={alert.label}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${alert.bg} border ${alert.border} ${alert.color}`}
                >
                  {alert.label}
                </div>
              ))}
            </div>
          </Section>

          <Section icon={BellRing} title={t("push.title", locale)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-foreground font-medium">
                  {t("push.title", locale)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("push.description", locale)}
                </p>
              </div>
              <PushToggle />
            </div>
          </Section>

          <Section icon={Settings} title={t("settings.section_danger_zone", locale)}>
            <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-400">
                    {t("settings.reset_title", locale)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.reset_hint", locale)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    toast.error(
                      t("settings.reset_not_implemented", locale)
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 whitespace-nowrap"
                >
                  {t("settings.reset_all", locale)}
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}