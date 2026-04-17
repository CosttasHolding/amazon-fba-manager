"use client";

import { useRouter } from "next/navigation";
import {
    Upload,
    Download,
    FileSpreadsheet,
    ArrowRight,
    Settings,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function ImportPage() {
    const router = useRouter();

    return (
        <div className="space-y-6 animate-fade-up">
            <PageHeader
                badge="DATOS"
                title="Importar Datos"
                subtitle="Importa y exporta información de tu negocio"
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Importar Datos" },
                ]}
            />

            {/* Import section - Coming soon */}
            <div className="rounded-2xl border border-border bg-card p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Upload className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Importar desde archivo
                    </h3>
                </div>

                <div className="flex items-center justify-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <div className="text-center max-w-md">
                        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                            <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h4 className="text-base font-semibold text-foreground mb-2">
                            Importación masiva de datos
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                            Pronto podrás importar productos, proveedores e inventario desde archivos CSV o Excel.
                            Incluirá mapeo de columnas, validación de datos y vista previa antes de importar.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-xs text-amber-500 font-medium">En desarrollo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Export section - Link to settings */}
            <div className="rounded-2xl border border-border bg-card p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Download className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Exportar datos
                    </h3>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-1">
                                Descarga tus datos en CSV
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Exporta productos, proveedores, inventario y ventas desde la sección de configuración.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/settings")}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                        >
                            <Settings className="h-4 w-4" />
                            Ir a Configuración
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Supported formats info */}
            <div className="rounded-2xl border border-border bg-card p-8">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                    Formatos soportados (próximamente)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { format: "CSV", desc: "Valores separados por comas", ext: ".csv" },
                        { format: "Excel", desc: "Hojas de cálculo Microsoft", ext: ".xlsx" },
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