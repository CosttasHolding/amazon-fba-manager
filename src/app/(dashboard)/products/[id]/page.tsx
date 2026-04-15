'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmt, fmtPct, roiColor, profitColor, stockColor } from '@/lib/utils';
import { ArrowLeft, Pencil, Trash2, Loader2, AlertTriangle, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetch(`/api/products/${params.id}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) { setError(d.error); }
                else { setProduct(d.data); }
                setLoading(false);
            })
            .catch(() => { setError('Error al cargar producto'); setLoading(false); });
    }, [params.id]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/products/${params.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar producto');
            toast({ title: 'Eliminado', description: 'Producto eliminado correctamente' });
            router.push('/products');
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Package className="w-12 h-12 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">{error || 'Producto no encontrado'}</p>
                <Button onClick={() => router.push('/products')}>Volver a Productos</Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/products')} className="rounded-xl">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            SKU: {product.sku} | ASIN: {product.asin || 'N/A'} | {product.marketplace}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 ml-14 sm:ml-0">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/products/${params.id}/edit`)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </Button>
                </div>
            </div>

            {showDeleteConfirm && (
                <Card className="border-red-500/50 bg-red-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="font-semibold text-foreground">Eliminar producto</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Esta accion eliminara permanentemente <strong>{product.name}</strong> y todos sus datos asociados.
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                                        {deleting ? 'Eliminando...' : 'Si, eliminar'}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-muted-foreground">Ganancia Neta</p>
                        <p className={`text-2xl font-bold ${profitColor(product.net_profit)}`}>{fmt(product.net_profit)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className={`text-2xl font-bold ${roiColor(product.roi)}`}>{fmtPct(product.roi)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-muted-foreground">Precio Venta</p>
                        <p className="text-2xl font-bold text-[hsl(var(--metric-blue))]">{fmt(product.sale_price)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-sm text-muted-foreground">Stock</p>
                        <p className="text-2xl font-bold text-foreground">{product.stock_available ?? 0}</p>
                        {product.stock_status && (
                            <Badge className={`mt-1 ${stockColor(product.stock_status)}`}>{product.stock_status}</Badge>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Costos</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {[['Costo Unitario', product.unit_cost], ['Envio', product.shipping_cost], ['Prep', product.prep_cost], ['Impuestos', product.taxes]].map(([label, value]) => (
                            <div key={label as string} className="flex justify-between">
                                <span className="text-muted-foreground">{label as string}</span>
                                <span className="font-medium text-foreground">{fmt(value as number)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between border-t border-border pt-3">
                            <span className="font-semibold text-foreground">Costo Total</span>
                            <span className="font-bold text-foreground">{fmt(product.total_cost)}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tarifas Amazon</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {[['Tarifa Referencia', product.referral_fee], ['Tarifa FBA', product.fba_fee], ['Almacenamiento/mes', product.storage_fee_monthly], ['Otros', product.other_fees]].map(([label, value]) => (
                            <div key={label as string} className="flex justify-between">
                                <span className="text-muted-foreground">{label as string}</span>
                                <span className="font-medium text-foreground">{fmt(value as number)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between border-t border-border pt-3">
                            <span className="font-semibold text-foreground">Total Tarifas</span>
                            <span className="font-bold text-foreground">{fmt(product.total_fees)}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Inventario</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {[['Disponible', product.stock_available ?? 0], ['En Transito', product.stock_inbound ?? 0], ['Reservado', product.stock_reserved ?? 0], ['Warehouse', product.stock_warehouse ?? 0]].map(([label, value]) => (
                            <div key={label as string} className="flex justify-between">
                                <span className="text-muted-foreground">{label as string}</span>
                                <span className="font-medium text-foreground">{String(value)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Informacion</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Estado</span>
                            <Badge>{product.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Categoria</span>
                            <span className="font-medium text-foreground">{product.category || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Peso</span>
                            <span className="font-medium text-foreground">{product.weight_kg ? `${product.weight_kg} kg` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Creado</span>
                            <span className="font-medium text-foreground">{new Date(product.created_at).toLocaleDateString()}</span>
                        </div>
                        {product.notes && (
                            <div className="pt-2 border-t border-border">
                                <p className="text-sm text-muted-foreground mb-1">Notas</p>
                                <p className="text-sm text-foreground">{product.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
