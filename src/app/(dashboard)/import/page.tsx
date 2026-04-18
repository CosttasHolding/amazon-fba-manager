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

interface PreviewRow {
  row: number;
  valid: boolean;
  errors: string[];
  data: Record<string, any>;
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
  invalidRows: { row: number; errors: string[]; data: Record<string, any> }[];
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, []);

  const validateAndSetFile = (f: File) => {
    const validExtensions = ["xlsx", "xls", "csv", "tsv"];
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !validExtensions.includes(ext)) {
      toast.error("Formato no soportado. Usa archivos .xlsx, .csv o .tsv");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("El archivo excede el limite de 5MB");
      return;
    }
    setFile(f);
    setPreview(null);
    setImportResult(null);
  };

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
        toast.error(data.error || "Error al procesar el archivo");
        return;
      }

      setPreview(data);
      setImportResult(null);

      if (data.invalidCount === 0) {
        toast.success(`${data.validCount} filas listas para importar`);
      } else {
        toast.warning(`${data.validCount} validas, ${data.invalidCount} con errores`);
      }
    } catch {
      toast.error("Error de conexion al servidor");
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
        toast.error(data.error || "Error al importar");
        return;
      }

      setImportResult(data);
      setPreview(null);

      if (data.insertErrors.length === 0) {
        toast.success(`${data.insertedCount} productos importados exitosamente`);
      } else {
        toast.warning(`${data.insertedCount} importados, ${data.insertErrors.length} errores`);
      }
    } catch {
      toast.error("Error de conexion al servidor");
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
        title="Importar Datos"
        subtitle="Importa productos desde archivos CSV o Excel"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Importar Datos" },
        ]}
      />

      {/* Template download + instructions */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Plantilla de importacion
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Descarga la plantilla Excel con los headers correctos y una fila de ejemplo.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Descargar plantilla
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Subir archivo
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
                Arrastra un archivo o haz clic para seleccionar
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Formatos: .xlsx, .csv, .tsv — Maximo 5MB, 500 filas
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Usa la plantilla para mejores resultados
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
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Analizar archivo
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={clearFile}
                  className="p-2 rounded-xl border border-border hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-colors"
                  title="Quitar archivo"
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
                    <p className="text-xs text-muted-foreground mt-1">Filas totales</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-500">{preview.validCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Validas</p>
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
                    <p className="text-xs text-muted-foreground mt-1">Con errores</p>
                  </div>
                </div>

                {/* Column mapping */}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                    Mapeo de columnas detectado
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
                        {!h.mapped && <span className="opacity-70">(ignorada)</span>}
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
                      {mode === "all" && `Todas (${preview.totalRows})`}
                      {mode === "valid" && `Validas (${preview.validCount})`}
                      {mode === "invalid" && `Errores (${preview.invalidCount})`}
                    </button>
                  ))}
                </div>

                {/* Preview table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground w-12">
                            #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground w-16">
                            Estado
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                            Nombre
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                            Precio
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                            Costo
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                            Detalles
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
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {r.row}
                            </td>
                            <td className="px-3 py-2">
                              {r.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-foreground">
                              {r.data.sku || "-"}
                            </td>
                            <td className="px-3 py-2 text-xs text-foreground max-w-[200px] truncate">
                              {r.data.name || "-"}
                            </td>
                            <td className="px-3 py-2 text-xs text-foreground">
                              {r.data.salePrice != null ? `
$$
{r.data.salePrice}` : "-"}
                            </td>
                            <td className="px-3 py-2 text-xs text-foreground">
                              {r.data.unitCost != null ? `
$$
{r.data.unitCost}` : "-"}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {r.valid ? (
                                <span className="text-emerald-500">OK</span>
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
                        Ver todas las {filteredRows.length} filas
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
                        Mostrar solo 20
                      </button>
                    </div>
                  )}
                </div>

                {/* Import button */}
                {preview.validCount > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {preview.validCount} producto{preview.validCount !== 1 ? "s" : ""} listo{preview.validCount !== 1 ? "s" : ""} para importar
                      </p>
                      {preview.invalidCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {preview.invalidCount} fila{preview.invalidCount !== 1 ? "s" : ""} con errores seran omitidas
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
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Importar {preview.validCount} productos
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
                    {importResult.insertedCount} producto{importResult.insertedCount !== 1 ? "s" : ""} importado{importResult.insertedCount !== 1 ? "s" : ""}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    De {importResult.totalRows} filas en el archivo
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
                    Importar otro archivo
                  </button>
                  <button
                    onClick={() => router.push("/products")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Ver productos
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
            Exportar datos
          </h3>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">
                Descarga tus datos en CSV o Excel
              </h4>
              <p className="text-sm text-muted-foreground">
                Exporta productos, proveedores, inventario y ventas desde cada seccion o desde configuracion.
              </p>
            </div>
            <button
              onClick={() => router.push("/settings")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              Ir a Configuracion
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Supported formats */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Formatos soportados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { format: "Excel", desc: "Hojas de calculo Microsoft", ext: ".xlsx" },
            { format: "CSV", desc: "Valores separados por comas", ext: ".csv" },
            { format: "TSV", desc: "Valores separados por tabs", ext: ".tsv" },
          ].map((item) => (
            <div
              key={item.format}
              className="rounded-xl border border-border bg-muted/20 p-4 text-center"
            >
              <p className="text-sm font-semibold text-foreground">{item.format}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{item.ext}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}