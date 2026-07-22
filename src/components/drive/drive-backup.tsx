"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertTriangle, Database, ShoppingCart, Package, Warehouse, Factory } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

const BACKUP_TYPES = [
  { type: "products" as const, labelKey: "drive.backup_products", icon: Package, color: "text-blue-500" },
  { type: "sales" as const, labelKey: "drive.backup_sales", icon: ShoppingCart, color: "text-emerald-500" },
  { type: "orders" as const, labelKey: "drive.backup_orders", icon: Database, color: "text-purple-500" },
  { type: "inventory" as const, labelKey: "drive.backup_inventory", icon: Warehouse, color: "text-amber-500" },
  { type: "suppliers" as const, labelKey: "drive.backup_suppliers", icon: Factory, color: "text-rose-500" },
];

export function DriveBackup() {
  const { locale } = useLocale();
  const [running, setRunning] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, { success: boolean; records?: number }>>({});

  const handleBackup = async (type: string) => {
    setRunning(type);
    try {
      const res = await fetch("/api/drive/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const result = await res.json();
      if (result.data?.success) {
        toast.success(t("drive.backup_success", locale).replace("{records}", String(result.data.records)));
        setLastResults((prev) => ({ ...prev, [type]: { success: true, records: result.data.records } }));
      } else {
        toast.error(result.error || t("drive.backup_error", locale));
        setLastResults((prev) => ({ ...prev, [type]: { success: false } }));
      }
    } catch {
      toast.error(t("drive.backup_error", locale));
      setLastResults((prev) => ({ ...prev, [type]: { success: false } }));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <Upload className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("drive.backup_title", locale)}</h3>
          <p className="text-xs text-muted-foreground">
            {t("drive.backup_desc", locale)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {BACKUP_TYPES.map(({ type, labelKey, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => handleBackup(type)}
            disabled={running !== null}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {running === type ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : lastResults[type]?.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : lastResults[type]?.success === false ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Icon className={`h-5 w-5 ${color} group-hover:scale-110 transition-transform`} />
            )}
            <span className="text-[11px] text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors">
              {t(labelKey, locale)}
            </span>
            {lastResults[type]?.records !== undefined && (
              <span className="text-[10px] text-muted-foreground/70">
                {lastResults[type].records} {t("drive.records", locale)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
