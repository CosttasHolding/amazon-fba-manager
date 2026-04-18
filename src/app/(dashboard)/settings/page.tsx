"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CAD", label: "CAD (C$)" },
  { value: "MXN", label: "MXN ($)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "AUD", label: "AUD (A$)" },
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
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = "bg-muted/50 border-border";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [exporting, setExporting] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    company: "",
    country: "",
  });
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
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
      }
    } catch {
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      setSettings(updated);
      toast.success("Configuración guardada correctamente");
    } catch {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = () => saveSettings(profile);
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
      if (!res.ok) throw new Error("Error al exportar");
      const data = await res.json();
      const items = data.data || data || [];
      if (items.length === 0) {
        toast.error(`No hay ${entity} para exportar`);
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
      toast.success(`${entity} exportado correctamente`);
    } catch {
      toast.error(`Error al exportar ${entity}`);
    } finally {
      setExporting("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Cargando configuración…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        badge="Sistema"
        title="Configuración"
        subtitle="Administra tu perfil, valores por defecto y datos"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Configuración" },
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
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={User} title="Información personal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nombre completo" icon={User}>
                <Input
                  className={inputClass}
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, full_name: e.target.value }))
                  }
                  placeholder="Tu nombre"
                />
              </Field>
              <Field label="Empresa" icon={Building2}>
                <Input
                  className={inputClass}
                  value={profile.company}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, company: e.target.value }))
                  }
                  placeholder="Nombre de empresa"
                />
              </Field>
              <Field label="País" icon={MapPin}>
                <Input
                  className={inputClass}
                  value={profile.country}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, country: e.target.value }))
                  }
                  placeholder="Tu país"
                />
              </Field>
            </div>
          </Section>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar perfil
            </Button>
          </div>
        </div>
      )}

      {/* FBA Defaults Tab */}
      {activeTab === "fba" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={Globe} title="Marketplace">
            <Field label="Marketplace de Amazon" icon={Globe}>
              <Select
                value={fba.marketplace}
                onValueChange={(v) =>
                  setFba((p) => ({ ...p, marketplace: v }))
                }
              >
                <SelectTrigger className={inputClass}>
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
          <Section icon={DollarSign} title="Tarifas por defecto">
            <p className="text-xs text-muted-foreground/60 -mt-2">
              Estos valores se usarán como predeterminados al crear nuevos
              productos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Field label="Tarifa FBA ($)" icon={DollarSign}>
                <Input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={fba.default_fba_fee}
                  onChange={(e) =>
                    setFba((p) => ({ ...p, default_fba_fee: e.target.value }))
                  }
                />
              </Field>
              <Field label="Referral fee (%)" icon={Percent}>
                <Input
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
              <Field label="Envío ($)" icon={Truck}>
                <Input
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
              <Field label="Almacenamiento ($)" icon={Warehouse}>
                <Input
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
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar FBA defaults
            </Button>
          </div>
        </div>
      )}

      {/* Calculations Tab */}
      {activeTab === "calculations" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={Calculator} title="Parámetros de cálculo">
            <p className="text-xs text-muted-foreground/60 -mt-2">
              Valores predeterminados para la calculadora de rentabilidad
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label="ROI objetivo (%)" icon={Target}>
                <Input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={calc.target_roi}
                  onChange={(e) =>
                    setCalc((p) => ({ ...p, target_roi: e.target.value }))
                  }
                />
              </Field>
              <Field label="Moneda" icon={Coins}>
                <Select
                  value={calc.currency}
                  onValueChange={(v) =>
                    setCalc((p) => ({ ...p, currency: v }))
                  }
                >
                  <SelectTrigger className={inputClass}>
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
              <Field label="Tasa impositiva (%)" icon={Receipt}>
                <Input
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
          <Section icon={BarChart3} title="Vista previa">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "ROI objetivo",
                  value: `${calc.target_roi}%`,
                  color: "text-green-400",
                },
                {
                  label: "Moneda",
                  value: calc.currency,
                  color: "text-primary",
                },
                {
                  label: "Impuestos",
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
          <div className="flex justify-end">
            <Button onClick={handleSaveCalc} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar cálculos
            </Button>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === "data" && (
        <div className="space-y-6 animate-fade-in">
          <Section icon={Download} title="Exportar datos">
            <p className="text-xs text-muted-foreground/60 -mt-2">
              Descarga tus datos en formato CSV
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  entity: "products",
                  label: "Productos",
                  icon: Tags,
                  color: "cyan",
                },
                {
                  entity: "suppliers",
                  label: "Proveedores",
                  icon: Building2,
                  color: "purple",
                },
                {
                  entity: "inventory",
                  label: "Inventario",
                  icon: BoxesIcon,
                  color: "amber",
                },
                {
                  entity: "sales",
                  label: "Ventas",
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
                    Exportar {item.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section icon={Upload} title="Importar datos">
            <div className="flex items-center justify-center py-10 border-2 border-dashed border-border rounded-xl bg-muted/20">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Función de importación en desarrollo
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto">
                  Pronto podrás importar productos y proveedores desde archivos
                  CSV
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-400 font-medium">
                    Próximamente
                  </span>
                </div>
              </div>
            </div>
          </Section>

          <Section icon={Settings} title="Zona de peligro">
            <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Restablecer configuración
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Restaura todos los valores por defecto. Esta acción no se
                    puede deshacer.
                  </p>
                </div>
                <button
                  onClick={() =>
                    toast.error(
                      "Función no implementada — usa las pestañas para editar valores"
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 whitespace-nowrap"
                >
                  Restablecer todo
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}