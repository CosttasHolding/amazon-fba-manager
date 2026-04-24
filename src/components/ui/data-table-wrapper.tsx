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
  "font-display uppercase text-[11px] tracking-[0.12em] text-white dark:text-muted-foreground px-6 py-4 text-left";

export const tableRowClass =
  "border-b border-border/50 hover:bg-foreground/[0.02] transition-colors";

export const tableCellClass = "px-6 py-4 text-sm";

export function DataTableWrapper({
  children,
  title,
  icon: Icon,
  actions,
  footer,
}: DataTableWrapperProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            )}
            <h3 className="font-display font-semibold text-foreground">{title}</h3>
          </div>
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