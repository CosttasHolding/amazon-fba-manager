import React from "react";
import { cn } from "@/lib/utils";

interface DataTableWrapperProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

export const tableHeaderClass =
  "font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-6 py-4 text-left";

export const tableRowClass =
  "border-b border-border/50 hover:bg-white/[0.02] transition-colors";

export const tableCellClass = "px-6 py-4 text-sm";

export function DataTableWrapper({
  children,
  title,
  actions,
  footer,
}: DataTableWrapperProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {children}

      {footer && (
        <div className="px-6 py-4 border-t border-border">{footer}</div>
      )}
    </div>
  );
}