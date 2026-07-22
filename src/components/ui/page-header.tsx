import React from "react";
import { Breadcrumbs, BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

export function PageHeader({
  badge,
  title,
  subtitle,
  breadcrumbs,
  children,
}: PageHeaderProps) {
  return (
    <div className="pb-6 mb-8 border-b border-border/30">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-3" />
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {badge && (
            <p className="font-display uppercase text-[11px] tracking-[0.2em] text-primary mb-1">
              {badge}
            </p>
          )}
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>
          )}
        </div>

        {children && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}