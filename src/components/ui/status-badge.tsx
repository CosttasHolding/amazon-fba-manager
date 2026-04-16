import React from "react";
import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  status: string;
  variant?: Variant;
  pulse?: boolean;
  size?: "sm" | "md";
}

const variantStyles: Record<Variant, { bg: string; dot: string; text: string }> = {
  success: {
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
  },
  warning: {
    bg: "bg-amber-500/10",
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
  danger: {
    bg: "bg-rose-500/10",
    dot: "bg-rose-400",
    text: "text-rose-400",
  },
  info: {
    bg: "bg-cyan-500/10",
    dot: "bg-cyan-400",
    text: "text-cyan-400",
  },
  neutral: {
    bg: "bg-slate-500/10",
    dot: "bg-slate-400",
    text: "text-slate-400",
  },
};

const autoDetectVariant = (status: string): Variant => {
  if (!status) return "neutral";
  const s = status.toLowerCase().trim();
  if (["active", "activo", "enviado", "delivered", "entregado", "completado", "completed"].includes(s)) return "success";
  if (["low_stock", "paused", "pendiente", "pending", "pausado", "low stock"].includes(s)) return "warning";
  if (["out_of_stock", "sin_stock", "sin stock", "cancelled", "cancelado", "deleted"].includes(s)) return "danger";
  if (["processing", "en_transito", "en transito", "in_transit", "enviando"].includes(s)) return "info";
  if (["discontinued", "descontinuado", "inactive", "inactivo"].includes(s)) return "neutral";
  return "info";
};

export function StatusBadge({
  status,
  variant,
  pulse = false,
  size = "md",
}: StatusBadgeProps) {
  const resolvedVariant = variant || autoDetectVariant(status);
  const styles = variantStyles[resolvedVariant];

  const sizeClasses = size === "sm" ? "px-2 py-0.5 gap-1" : "px-2.5 py-1 gap-1.5";
  const dotSize = size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-display font-medium",
        "uppercase text-[11px] tracking-wider",
        styles.bg,
        styles.text,
        sizeClasses
      )}
    >
      <span
        className={cn(
          "rounded-full flex-shrink-0",
          styles.dot,
          dotSize,
          pulse && "animate-pulse-glow"
        )}
      />
      {status}
    </span>
  );
}