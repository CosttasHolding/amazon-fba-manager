"use client";

import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Link2, ExternalLink, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function SpApiPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge="INTEGRACION"
        title="Amazon SP-API"
        subtitle="Conecta tu Seller Central para sincronizacion automatica de datos"
      />

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Proximamente</p>
            <p className="text-sm text-muted-foreground mt-1">
              La integracion con Amazon Selling Partner API requiere registro de aplicacion en Seller Central,
              OAuth 2.0, y gestion de rate limits. Esta funcionalidad esta planeada para una futura version.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-foreground">Datos sincronizados</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Inventario en tiempo real</li>
              <li>• Ordenes y ventas</li>
              <li>• Fees exactos de Amazon</li>
              <li>• Returns y reimbursements</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-foreground">Automatizaciones</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Alertas de stock bajo</li>
              <li>• Deteccion de reimbursements</li>
              <li>• Reporte de fees mensual</li>
              <li>• Sync de PPC metrics</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-foreground">Requisitos</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Cuenta Professional Seller</li>
              <li>• App registrada en Seller Central</li>
              <li>• OAuth consent screen</li>
              <li>• Rate limit handling</li>
            </ul>
          </div>
        </div>
      </div>

      <DataTableWrapper title="Cuentas Conectadas" icon={Link2}>
        <div className="p-8 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay cuentas de Amazon conectadas.</p>
          <p className="text-xs text-muted-foreground mt-1">La integracion SP-API estara disponible proximamente.</p>
        </div>
      </DataTableWrapper>
    </div>
  );
}
