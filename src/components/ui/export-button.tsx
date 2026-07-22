"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface ExportButtonProps {
  type?: "products" | "inventory" | "sales" | "suppliers";
  onClick?: () => void;
  label?: string;
}

export function ExportButton({ type, onClick, label }: ExportButtonProps) {
  const { locale } = useLocale();
  const buttonLabel = label || t("common.export", locale);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (!type) return;

    try {
      setExporting(true);
      const res = await fetch(`/api/export?type=${type}`);

      if (!res.ok) {
        throw new Error(t("export.error", locale));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disposition = res.headers.get("Content-Disposition");
      const filename =
        disposition?.match(/filename=(.+)/)?.[1] ||
        `FBA_${type}_${new Date().toISOString().split("T")[0]}.xlsx`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(t("export.success", locale));
    } catch {
      toast.error(t("export.error_data", locale));
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {exporting ? t("export.exporting", locale) : buttonLabel}
    </button>
  );
}