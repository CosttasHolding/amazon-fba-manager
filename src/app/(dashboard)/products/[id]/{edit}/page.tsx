'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmt, fmtPct, roiColor, profitColor, stockColor } from '@/lib/utils';

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
                if (d.error) {
                    setError(d.error);
                } else {
                    setProduct(d.data);
                }
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
                <p className="text-lg text-slate-500">Cargando producto...</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-lg text-red-500">
                    {error || 'Producto no encontrado'}
                </p>
                <Button onClick={() => router.push('/products')}>
                    Volver a Productos
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{product.name}</h1>
                    <p className="text-slate-500 mt-1">
                        SKU: {product.sku} | ASIN: {product.asin || 'N/A'} | Marketplace:{' '}
                        {product.marketplace}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push('/products')}>
                        Volver
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-slate-500">Ganancia Neta</p>
                        <p
                            className={`text-2xl font-bold ${profitColor(
                                product.net_profit
                            )}`}
                        >
                            {fmt(product.net_profit)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-slate-500">ROI</p>
                        <p className={`text-2xl font-bold ${roiColor(product.roi)}`}>
                            {fmtPct(product.roi)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-slate-500">Precio Venta</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {fmt(product.sale_price)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-slate-500">Stock</p>
                        <p className="text-2xl font-bold">
                            {product.stock_available ?? 0}
                        </p>
                        {product.stock_status && (
                            <Badge className={`mt-1 ${stockColor(product.stock_status)}`}>
                                {product.stock_status}
                            </Badge>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Costos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Costo Unitario</span>
                            <span className="font-medium">{fmt(product.unit_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Envío</span>
                            <span className="font-medium">
                                {fmt(product.shipping_cost)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Prep</span>
                            <span className="font-medium">{fmt(product.prep_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Impuestos</span>
                            <span className="font-medium">{fmt(product.taxes)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-3">
                            <span className="font-semibold">Costo Total</span>
                            <span className="font-bold">{fmt(product.total_cost)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tarifas Amazon</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tarifa Referencia</span>
                            <span className="font-medium">
                                {fmt(product.referral_fee)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tarifa FBA</span>
                            <span className="font-medium">{fmt(product.fba_fee)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Almacenamiento/mes</span>
                            <span className="font-medium">
                                {fmt(product.storage_fee_monthly)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Otros</span>
                            <span className="font-medium">{fmt(product.other_fees)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-3">
                            <span className="font-semibold">Total Tarifas</span>
                            <span className="font-bold">{fmt(product.total_fees)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Inventario</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Disponible</span>
                            <span className="font-medium">
                                {product.stock_available ?? 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">En Tránsito</span>
                            <span className="font-medium">
                                {product.stock_inbound ?? 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Reservado</span>
                            <span className="font-medium">
                                {product.stock_reserved ?? 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Warehouse</span>
                            <span className="font-medium">
                                {product.stock_warehouse ?? 0}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Información</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Estado</span>
                            <Badge>{product.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Categoría</span>
                            <span className="font-medium">
                                {product.category || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Peso</span>
                            <span className="font-medium">
                                {product.weight_kg ? `${product.weight_kg} kg` : 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Creado</span>
                            <span className="font-medium">
                                {new Date(product.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}