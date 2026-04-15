import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function fmt(value: number | null | undefined): string {
    if (value === null || value === undefined) return '\$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
}

export function fmtPct(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
}

export function roiColor(roi: number | null | undefined): string {
    if (!roi) return 'text-muted-foreground';
    if (roi >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (roi >= 50) return 'text-green-600 dark:text-green-400';
    if (roi >= 25) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

export function profitColor(profit: number | null | undefined): string {
    if (!profit) return 'text-muted-foreground';
    if (profit > 0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-red-600 dark:text-red-400';
}

export function stockColor(status: string): string {
    switch (status) {
        case 'in_stock':
        case 'normal':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
        case 'low_stock':
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
        case 'out_of_stock':
            return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
        default:
            return 'bg-secondary text-muted-foreground';
    }
}