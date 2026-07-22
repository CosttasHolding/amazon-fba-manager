import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  icon: Icon,
  actions,
  children,
  footer,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl overflow-hidden",
        "transition-all duration-200",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            )}
            <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">
              {title}
            </h3>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className={cn("p-6", bodyClassName)}>
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          {footer}
        </div>
      )}
    </div>
  );
}
