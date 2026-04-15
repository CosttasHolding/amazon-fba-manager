'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmt, fmtPct, roiColor, profitColor, stockColor } from '@/lib/utils';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Package } from 'lucide-react';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/products/${params.id}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) setError(d.error);
                else setProduct(d.data);
                setLoading(false);
            })
            .catch(() => {
                setError('Error al cargar producto');
                setLoading(false);
            });
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Cargando producto...</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-red-500 dark:text-red-400">{error || 'No encontrado'}</p>
                <Button variant="outline" onClick={() => router.push('/products')}>
                    Volver a Productos
                </Button>
            </div>
        );
    }

    const topMetrics = [
        {
            label: 'Ganancia Neta',
            value: fmt(product.net_profit),
            color: profitColor(product.net_profit),
            icon: DollarSign,
            bg: 'bg-[hsl(var(--metric-green-bg))]',
        },
        {
            label: 'ROI',
            value: fmtPct(product.roi),
            color: roiColor(product.roi),
            icon: TrendingUp,
            bg: 'bg-[hsl(var(--metric-blue-bg))]',
        },
        {
            label: 'Precio Venta',
            value: fmt(product.sale_price),
            color: 'text-[hsl(var(--metric-purple))]',
            icon: ShoppingCart,
            bg: 'bg-[hsl(var(--metric-purple-bg))]',
        },
        {
            label: 'Stock',
            value: product.stock_available ?? 0,
            color: 'text-foreground',
            icon: Package,
            bg: 'bg-[hsl(var(--subtle-bg))]',
            badge: product.stock_status,
        },
    ];

    return (
        <div className="max-w-5xl">
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/products')}
                    className="rounded-xl"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono text-muted-foreground">{product.sku}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{product.asin || 'Sin ASIN'}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <Badge variant="secondary" className="text-xs">{product.marketplace}</Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                {topMetrics.map((m) => (
                    <Card key={m.label} className="hover-lift">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    {m.label}
                                </p>
                                <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>
                                    <m.icon className={`w-4 h-4 ${m.color}`} />
                                </div>
                            </div>
                            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                            {m.badge && (
                                <Badge className={`mt-2 text-xs ${stockColor(m.badge)}`}>
                                    {m.badge}
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-5">
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Costos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            ['Costo Unitario', product.unit_cost],
                            ['Envío', product.shipping_cost],
                            ['Prep', product.prep_cost],
                            ['Impuestos', product.taxes],
                        ].map(([label, val]) => (
                            <div key={label as string} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}</span>
                                <span>{fmt(val as number)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-sm pt-3 border-t border-border">
                            <span className="font-semibold">Costo Total</span>
                            <span className="font-bold">{fmt(product.total_cost)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Tarifas Amazon
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            ['Referencia', product.referral_fee],
                            ['FBA', product.fba_fee],
                            ['Almacenamiento/mes', product.storage_fee_monthly],
                            ['Otros', product.other_fees],
                        ].map(([label, val]) => (
                            <div key={label as string} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}</span>
                                <span>{fmt(val as number)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-sm pt-3 border-t border-border">
                            <span className="font-semibold">Total Tarifas</span>
                            <span className="font-bold">{fmt(product.total_fees)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Inventario
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            ['Disponible', product.stock_available ?? 0],
                            ['En Tránsito', product.stock_inbound ?? 0],
                            ['Reservado', product.stock_reserved ?? 0],
                            ['Warehouse', product.stock_warehouse ?? 0],
                        ].map(([label, val]) => (
                            <div key={label as string} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-medium">{val as number}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Información
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Estado</span>
                            <Badge variant="secondary">{product.status}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Categoría</span>
                            <span>{product.category || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Peso</span>
                            <span>{product.weight_kg ? `${product.weight_kg} kg` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Creado</span>
                            <span>{new Date(product.created_at).toLocaleDateString()}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}