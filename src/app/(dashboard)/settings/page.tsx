"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "fba", label: "FBA Defaults", icon: Package },
  { id: "calculations", label: "C\u00E1lculos", icon: Calculator },
  { id: "data", label: "Datos", icon: FileText },
] as const;

const MARKETPLACES = [
  { value: "US", label: "Estados Unidos (US)" },
  { value: "CA", label: "Canad\u00E1 (CA)" },
  { value: "MX", label: "M\u00E9xico (MX)" },
  { value: "UK", label: "Reino Unido (UK)" },
  { value: "DE", label: "Alemania (DE)" },
  { value: "FR", label: "Francia (FR)" },
  { value: "IT", label: "Italia (IT)" },
  { value: "ES", label: "Espa\u00F1a (ES)" },
  { value: "JP", label: "Jap\u00F3n (JP)" },
  { value: "AU", label: "Australia (AU)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (\u20AC)" },
  { value: "GBP", label: "GBP (\u00A3)" },
  { value: "CAD", label: "CAD (C$)" },
  { value: "MXN", label: "MXN ($)" },
  { value: "JPY", label: "JPY (\u00A5)" },
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [exporting, setExporting] = useState("");

  // Form states
  const [profile, setProfile] = useState({ full_name: "", company: "", country: "" });
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
    } catch (error) {
      toast.error("Error al cargar configuraci\u00F3n");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (data: Record<string, any>) => {
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
      toast.success("Configuraci\u00F3n guardada correctamente");
    } catch (error) {
      toast.error("Error al guardar configuraci\u00F3n");
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
        const values = headers.map((h) => {
          const val = item[h];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        });
        csvRows.push(values.join(","));
      }

      const csv = csvRows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${entity}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${entity} exportado correctamente`);
    } catch (error) {
      toast.error(`Error al exportar ${entity}`);
    } finally {
      setExporting("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configuraci{"\u00F3"}n
        </h1>
        <p className="text-sm text-muted-foreground">
          Administra tu perfil, valores por defecto y datos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil
            </CardTitle>
            <CardDescription>Tu informaci{"\u00F3"}n personal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={profile.company}
                  onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
                  placeholder="Nombre de empresa"
                />
              </div>
              <div>
                <Label htmlFor="country">Pa{"\u00ED"}s</Label>
                <Input
                  id="country"
                  value={profile.country}
                  onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                  placeholder="Tu pa\u00EDs"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar perfil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FBA Defaults Tab */}
      {activeTab === "fba" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Valores por defecto FBA
            </CardTitle>
            <CardDescription>
              Estos valores se usar{"\u00E1"}n como predeterminados al crear nuevos productos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Marketplace</Label>
              <Select value={fba.marketplace} onValueChange={(v) => setFba((p) => ({ ...p, marketplace: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARKETPLACES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Tarifa FBA ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fba.default_fba_fee}
                  onChange={(e) => setFba((p) => ({ ...p, default_fba_fee: e.target.value }))}
                />
              </div>
              <div>
                <Label>Referral fee (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fba.default_referral_fee}
                  onChange={(e) => setFba((p) => ({ ...p, default_referral_fee: e.target.value }))}
                />
              </div>
              <div>
                <Label>Env{"\u00ED"}o ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fba.default_shipping_cost}
                  onChange={(e) => setFba((p) => ({ ...p, default_shipping_cost: e.target.value }))}
                />
              </div>
              <div>
                <Label>Almacenamiento ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fba.default_storage_cost}
                  onChange={(e) => setFba((p) => ({ ...p, default_storage_cost: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveFba} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar FBA defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculations Tab */}
      {activeTab === "calculations" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              C{"\u00E1"}lculos
            </CardTitle>
            <CardDescription>
              Valores predeterminados para la calculadora de rentabilidad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>ROI objetivo (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={calc.target_roi}
                  onChange={(e) => setCalc((p) => ({ ...p, target_roi: e.target.value }))}
                />
              </div>
              <div>
                <Label>Moneda</Label>
                <Select value={calc.currency} onValueChange={(v) => setCalc((p) => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tasa impositiva (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={calc.tax_rate}
                  onChange={(e) => setCalc((p) => ({ ...p, tax_rate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveCalc} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar c{"\u00E1"}lculos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Operations Tab */}
      {activeTab === "data" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exportar datos
              </CardTitle>
              <CardDescription>
                Descarga tus datos en formato CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { entity: "products", label: "Productos" },
                  { entity: "suppliers", label: "Proveedores" },
                  { entity: "inventory", label: "Inventario" },
                  { entity: "sales", label: "Ventas" },
                ].map((item) => (
                  <Button
                    key={item.entity}
                    variant="outline"
                    onClick={() => handleExport(item.entity)}
                    disabled={exporting === item.entity}
                    className="w-full"
                  >
                    {exporting === item.entity ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar datos
              </CardTitle>
              <CardDescription>
                Pr{"\u00F3"}ximamente: importa datos desde archivos CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8 border-2 border-dashed border-border rounded-lg">
                <div className="text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Funci{"\u00F3"}n de importaci{"\u00F3"}n en desarrollo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pronto podr{"\u00E1"}s importar productos y proveedores desde CSV
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}