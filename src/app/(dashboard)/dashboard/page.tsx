'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { fmt, fmtPct } from '@/lib/utils';
import { DashboardMetrics } from '@/types';
import { Package, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then((r) => r.json())
            .then((d) => {
                setMetrics(d.metrics);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Cargando métricas...</p>
                </div>
            </div>
        );
    }

    const cards = [
        {
            label: 'Productos Activos',
            value: metrics?.active_products || 0,
            sub: `de ${metrics?.total_products || 0} total`,
            icon: Package,
            color: 'text-[hsl(var(--metric-blue))]',
            bg: 'bg-[hsl(var(--metric-blue-bg))]',
        },
        {
            label: 'ROI Promedio',
            value: fmtPct(metrics?.avg_roi || 0),
            sub: 'retorno de inversión',
            icon: TrendingUp,
            color: 'text-[hsl(var(--metric-green))]',
            bg: 'bg-[hsl(var(--metric-green-bg))]',
        },
        {
            label: 'Ganancia Potencial',
            value: fmt(metrics?.total_potential_profit || 0),
            sub: 'por unidad vendida',
            icon: DollarSign,
            color: 'text-[hsl(var(--metric-purple))]',
            bg: 'bg-[hsl(var(--metric-purple-bg))]',
        },
        {
            label: 'Alertas de Stock',
            value: (metrics?.low_stock_count || 0) + (metrics?.out_of_stock_count || 0),
            sub: `${metrics?.low_stock_count || 0} bajo, ${metrics?.out_of_stock_count || 0} sin stock`,
            icon: AlertTriangle,
            color: 'text-[hsl(var(--metric-amber))]',
            bg: 'bg-[hsl(var(--metric-amber-bg))]',
        },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Resumen de tu negocio Amazon FBA
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {cards.map((card) => (
                    <Card key={card.label} className="hover-lift">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                                    <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
                                        {card.label}
                                    </p>
                                    <p className={`text-lg sm:text-2xl font-bold ${card.color}`}>
                                        {card.value}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                                        {card.sub}
                                    </p>
                                </div>
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0 ml-2`}>
                                    <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}