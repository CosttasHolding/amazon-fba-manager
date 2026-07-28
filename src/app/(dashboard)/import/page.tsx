"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Download,
  FileSpreadsheet,
  ArrowRight,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileUp,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface PreviewRow {
  row: number;
  valid: boolean;
  errors: string[];
  data: Record<string, string | number | undefined>;
}

interface PreviewResult {
  mode: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  headerMapping: { original: string; mapped: string | null }[];
  rows: PreviewRow[];
}

interface ImportResult {
  mode: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  insertedCount: number;
  insertErrors: string[];
  invalidRows: { row: number; errors: string[]; data: Record<string, string | number | undefined> }[];
}

const FIELD_LABELS: Record<string, string> = {
  sku: "SKU",
  asin: "ASIN",
  name: "Nombre",
  category: "Categoria",
  weightKg: "Peso (kg)",
  marketplace: "Marketplace",
  unitCost: "Costo unitario",
  shippingCost: "Costo envio",
  prepCost: "Costo prep",
  taxes: "Impuestos",
  salePrice: "Precio venta",
  referralFee: "Comision referido",
  fbaFee: "Comision FBA",
  storageFeeMonthly: "Almacenamiento",
  otherFees: "Otros costos",
  status: "Estado",
  notes: "Notas",
};

export default function ImportPage() {
  const { locale } = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "valid" | "invalid">("all");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndSetFile = useCallback((f: File) => {
    const validExtensions = ["xlsx", "xls", "csv", "tsv"];
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !validExtensions.includes(ext)) {
      toast.error(t("import.error_format", locale));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error(t("import.error_size", locale));
      return;
    }
    setFile(f);
    setPreview(null);
    setImportResult(null);
  }, [locale]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, [validateAndSetFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, [validateAndSetFile]);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setShowAllErrors(false);
    setFilterMode("all");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("import.error_processing", locale));
        return;
      }

      setPreview(data);
      setImportResult(null);

      if (data.invalidCount === 0) {
        toast.success(t("import.rows_ready", locale).replace("{count}", data.validCount));
      } else {
        toast.warning(`${data.validCount} validas, ${data.invalidCount} con errores`);
      }
    } catch {
      toast.error(t("import.error_connection", locale));
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview || preview.validCount === 0) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "import");

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("import.error_importing", locale));
        return;
      }

      setImportResult(data);
      setPreview(null);

      if (data.insertErrors.length === 0) {
        toast.success(t("import.success", locale).replace("{count}", data.insertedCount));
      } else {
        toast.warning(`${data.insertedCount} importados, ${data.insertErrors.length} errores`);
      }
    } catch {
      toast.error(t("import.error_connection", locale));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    window.open("/api/import/template", "_blank");
  };

  const filteredRows = preview?.rows.filter((r) => {
    if (filterMode === "valid") return r.valid;
    if (filterMode === "invalid") return !r.valid;
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="DATOS"
        title={t("import.title", locale)}
        subtitle={t("import.subtitle", locale)}
        breadcrumbs={[
          { label: t("nav.dashboard", locale), href: "/dashboard" },
          { label: t("import.title", locale) },
        ]}
      />

      {/* Template download + instructions */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {t("import.template_title", locale)}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("import.template_desc", locale)}
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            {t("import.download_template", locale)}
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t("import.upload_section", locale)}
          </h3>
        </div>

        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center justify-center py-12 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <div className="text-center max-w-md">
              <div
                className={`mx-auto mb-4 h-14 w-14 rounded-2xl border flex items-center justify-center transition-colors ${
                  dragActive
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted/50 border-border"
                }`}
              >
                <FileUp
                  className={`h-6 w-6 ${
                    dragActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <h4 className="text-base font-semibold text-foreground mb-1">
                {t("import.drop_zone_title", locale)}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t("import.drop_zone_hint", locale)}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("import.drop_zone_tip", locale)}
                </span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!preview && !importResult && (
                  <button
                    onClick={handlePreview}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("import.file_analyzing", locale)}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {t("import.analyze_button", locale)}
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={clearFile}
                  className="p-2 rounded-xl border border-border hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-colors"
                  title={t("import.remove_file", locale)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preview results */}
            {preview && (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{preview.totalRows}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("import.total_rows", locale)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-500">{preview.validCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("import.valid_rows", locale)}</p>
                  </div>
                  <div
                    className={`rounded-xl border p-4 text-center ${
                      preview.invalidCount > 0
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <p
                      className={`text-2xl font-bold ${
                        preview.invalidCount > 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {preview.invalidCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t("import.error_rows", locale)}</p>
                  </div>
                </div>

                {/* Column mapping */}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                    {t("import.column_mapping", locale)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preview.headerMapping.map((h, i) => (
                      <div
                        key={i}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                          h.mapped
                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                            : "border-amber-500/20 bg-amber-500/5 text-amber-500"
                        }`}
                      >
                        {h.mapped ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        <span className="font-medium">{h.original}</span>
                        {h.mapped && (
                          <>
                            <ArrowRight className="h-3 w-3 opacity-50" />
                            <span>{FIELD_LABELS[h.mapped] || h.mapped}</span>
                          </>
                        )}
                        {!h.mapped && <span className="opacity-70">{t("import.column_ignored", locale)}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2">
                  {(["all", "valid", "invalid"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilterMode(mode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {mode === "all" && `${t("import.filter_all", locale)} (${preview.totalRows})`}
                      {mode === "valid" && `${t("import.filter_valid", locale)} (${preview.validCount})`}
                      {mode === "invalid" && `${t("import.filter_invalid", locale)} (${preview.invalidCount})`}
                    </button>
                  ))}
                </div>

                {/* Preview table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-foreground w-12">
                            {t("import.table_num", locale)}
                          </th>
                          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-foreground w-16">
                            {t("import.table_status", locale)}
                          </th>
                          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-foreground">
                            {t("import.table_sku", locale)}
                          </th>
                          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-foreground">
                            {t("import.table_name", locale)}
                          </th>
                          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-foreground">
                            {t("import.table_price", locale)}
                          </th>
                          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-foreground">
                            {t("import.table_cost", locale)}
                          </th>
                          <th scope="col" className="px-4 py-3 text-start text-xs font-semibold text-foreground">
                            {t("import.table_details", locale)}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows?.slice(0, showAllErrors ? undefined : 20).map((r) => (
                          <tr
                            key={r.row}
                            className={`border-b border-border/50 ${
                              r.valid ? "" : "bg-destructive/5"
                            }`}
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {r.row}
                            </td>
                            <td className="px-4 py-3">
                              {r.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-foreground">
                              {r.data.sku || "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground max-w-[200px] truncate">
                              {r.data.name || "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground">
                              {r.data.salePrice != null ? `$${r.data.salePrice}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground">
                              {r.data.unitCost != null ? `$${r.data.unitCost}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {r.valid ? (
                                <span className="text-emerald-500">{t("import.ok_status", locale)}</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {r.errors.map((err, ei) => (
                                    <p key={ei} className="text-destructive">
                                      {err}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredRows && filteredRows.length > 20 && !showAllErrors && (
                    <div className="p-3 border-t border-border bg-muted/20 text-center">
                      <button
                        onClick={() => setShowAllErrors(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        {t("import.show_all_rows", locale).replace("{count}", String(filteredRows.length))}
                      </button>
                    </div>
                  )}
                  {showAllErrors && filteredRows && filteredRows.length > 20 && (
                    <div className="p-3 border-t border-border bg-muted/20 text-center">
                      <button
                        onClick={() => setShowAllErrors(false)}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                        {t("import.show_only_20", locale)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Import button */}
                {preview.validCount > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t("import.products_ready", locale).replace("{count}", String(preview.validCount))}
                      </p>
                      {preview.invalidCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("import.errors_will_be_skipped", locale).replace("{count}", String(preview.invalidCount))}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("import.importing", locale)}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {t("import.import_button", locale).replace("{count}", String(preview.validCount))}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className="space-y-4">
                <div
                  className={`rounded-xl border p-6 text-center ${
                    importResult.insertErrors.length === 0
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-amber-500/20 bg-amber-500/5"
                  }`}
                >
                  <div
                    className={`mx-auto mb-3 h-12 w-12 rounded-2xl flex items-center justify-center ${
                      importResult.insertErrors.length === 0
                        ? "bg-emerald-500/10"
                        : "bg-amber-500/10"
                    }`}
                  >
                    {importResult.insertErrors.length === 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-1">
                    {t("import.import_success_title", locale).replace("{count}", String(importResult.insertedCount))}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("import.from_rows", locale).replace("{count}", String(importResult.totalRows))}
                  </p>
                  {importResult.insertErrors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {importResult.insertErrors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={clearFile}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {t("import.import_another", locale)}
                  </button>
                  <button
                    onClick={() => router.push("/products")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {t("import.view_products", locale)}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t("import.export_section_title", locale)}
          </h3>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">
                {t("import.export_desc_title", locale)}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("import.export_desc", locale)}
              </p>
            </div>
            <button
              onClick={() => router.push("/settings")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              {t("import.go_to_settings", locale)}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Supported formats */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          {t("import.supported_formats_title", locale)}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { format: t("import.format_excel", locale), desc: t("import.format_excel_desc", locale), ext: t("import.format_excel_ext", locale) },
            { format: "CSV", desc: t("import.format_csv_desc", locale), ext: ".csv" },
            { format: "TSV", desc: t("import.format_tsv_desc", locale), ext: ".tsv" },
          ].map((item) => (
            <div
              key={item.format}
              className="rounded-xl border border-border bg-muted/20 p-4 text-center"
            >
              <p className="text-sm font-semibold text-foreground">{item.format}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">{item.ext}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
