"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accentColor?: "cyan" | "green" | "amber" | "red" | "purple";
  animationDelay?: number;
  progressBar?: number;
}

const accentMap = {
  cyan: {
    iconBg: "bg-gradient-to-br from-cyan-500/20 to-cyan-400/10",
    iconText: "text-cyan-400",
    progressBar: "bg-cyan-500",
    glow: "hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]",
  },
  green: {
    iconBg: "bg-gradient-to-br from-emerald-500/20 to-emerald-400/10",
    iconText: "text-emerald-400",
    progressBar: "bg-emerald-500",
    glow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500/20 to-amber-400/10",
    iconText: "text-amber-400",
    progressBar: "bg-amber-500",
    glow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  },
  red: {
    iconBg: "bg-gradient-to-br from-rose-500/20 to-rose-400/10",
    iconText: "text-rose-400",
    progressBar: "bg-rose-500",
    glow: "hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]",
  },
  purple: {
    iconBg: "bg-gradient-to-br from-purple-500/20 to-purple-400/10",
    iconText: "text-purple-400",
    progressBar: "bg-purple-500",
    glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]",
  },
};

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  accentColor = "cyan",
  animationDelay = 0,
  progressBar,
}: KpiCardProps) {
  const accent = accentMap[accentColor];

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-rose-400"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-4 sm:p-6 relative overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.01]",
        accent.glow,
        "animate-fade-up"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {Icon && (
        <div
          className={cn(
            "absolute top-3 right-3 sm:top-4 sm:right-4 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5",
            accent.iconBg
          )}
        >
          <Icon className={cn("w-3.5 h-3.5 sm:w-5 sm:h-5", accent.iconText)} />
        </div>
      )}

      <p className="font-display uppercase text-[10px] sm:text-[11px] tracking-[0.15em] text-muted-foreground mb-2 sm:mb-3 pr-8 sm:pr-0">
        {label}
      </p>

      <p className="font-display text-xl sm:text-3xl font-bold tabular-nums text-foreground">
        {value}
      </p>

      {trend && trendValue && (
        <div className={cn("flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2", trendColor)}>
          <TrendIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="text-[10px] sm:text-xs font-medium font-display">{trendValue}</span>
        </div>
      )}

      {subtitle && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}

      {typeof progressBar === "number" && (
        <div className="mt-3 sm:mt-4 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              accent.progressBar,
              "animate-progress-fill"
            )}
            style={{ width: `${Math.min(Math.max(progressBar, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}