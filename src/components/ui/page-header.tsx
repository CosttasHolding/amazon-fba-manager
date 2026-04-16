import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

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
    <div className="mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-muted-foreground/50">›</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-cyan-400 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground/70">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          {badge && (
            <p className="font-display uppercase text-[11px] tracking-[0.2em] text-cyan-400 mb-1">
              {badge}
            </p>
          )}
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
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