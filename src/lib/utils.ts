import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "$0.00";
  return `$${Number(value).toFixed(decimals)}`;
}

export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "0%";
  return `${Number(value).toFixed(decimals)}%`;
}

export function roiColor(roi: number | null | undefined): string {
  if (roi == null) return "text-muted-foreground";
  if (roi >= 30) return "text-emerald-500";
  if (roi >= 15) return "text-amber-500";
  return "text-rose-500";
}

export function profitColor(profit: number | null | undefined): string {
  if (profit == null) return "text-muted-foreground";
  if (profit > 0) return "text-emerald-500";
  if (profit === 0) return "text-amber-500";
  return "text-rose-500";
}

export function stockColor(status: string | null | undefined): string {
  switch (status) {
    case "normal":
      return "text-green-500";
    case "low_stock":
      return "text-amber-500";
    case "out_of_stock":
      return "text-red-500";
    case "overstock":
      return "text-blue-500";
    default:
      return "text-muted-foreground";
  }
}
