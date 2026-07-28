import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DataTableWrapperProps {
  children: React.ReactNode;
  title?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

export const tableHeaderClass =
  "font-display uppercase text-[11px] tracking-[0.12em] text-muted-foreground px-4 py-3 text-start border-b-2 border-border";

export const tableRowClass =
  "border-b border-border/40 hover:bg-muted/30 transition-colors even:bg-muted/10";

export const tableCellClass = "px-4 py-3 text-sm";

export function DataTableWrapper({
  children,
  title,
  icon: Icon,
  actions,
  footer,
}: DataTableWrapperProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {title && (
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2.5" aria-live="polite">
            {Icon && (
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            )}
            <h2 className="font-display text-sm font-semibold text-foreground tracking-tight">{title}</h2>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 border-t border-border bg-muted/10">{footer}</div>
      )}
    </div>
  );
}