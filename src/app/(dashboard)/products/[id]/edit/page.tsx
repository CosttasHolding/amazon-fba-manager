'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '@/validations/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { calcMetrics } from '@/lib/calculations';
import { fmt, fmtPct } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            marketplace: 'US', status: 'active',
            unitCost: 0, shippingCost: 0, prepCost: 0, taxes: 0,
            salePrice: 0, referralFee: 0, fbaFee: 0, storageFeeMonthly: 0, otherFees: 0,
        },
    });

    const w = watch();
    const metrics = calcMetrics(
        w.unitCost || 0, w.shippingCost || 0, w.prepCost || 0, w.taxes || 0,
        w.salePrice || 0, w.referralFee || 0, w.fbaFee || 0, w.storageFeeMonthly || 0, w.otherFees || 0
    );

    useEffect(() => {
        fetch(`/api/products/${params.id}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) {
                    setError(d.error);
                } else {
                    const p = d.data;
                    reset({
                        sku: p.sku,
                        asin: p.asin || '',
                        name: p.name,
                        category: p.category || undefined,
                        weightKg: p.weight_kg || undefined,
                        marketplace: p.marketplace || 'US',
                        unitCost: p.unit_cost || 0,
                        shippingCost: p.shipping_cost || 0,
                        prepCost: p.prep_cost || 0,
                        taxes: p.taxes || 0,
                        salePrice: p.sale_price || 0,
                        referralFee: p.referral_fee || 0,
                        fbaFee: p.fba_fee || 0,
                        storageFeeMonthly: p.storage_fee_monthly || 0,
                        otherFees: p.other_fees || 0,
                        status: p.status || 'active',
                        notes: p.notes || '',
                    });
                }
                setLoading(false);
            })
            .catch(() => {
                setError('Error al cargar producto');
                setLoading(false);
            });
    }, [params.id, reset]);

    const onSubmit = async (data: ProductForm) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/products/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Error al actualizar producto');
            toast({ title: 'Exito', description: 'Producto actualizado correctamente' });
            router.push(`/products/${params.id}`);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally { setSaving(false); }
    };

    const FieldError = ({ msg }: { msg?: string }) =>
        msg ? <p className="text-xs text-red-500 dark:text-red-400 mt-1">{msg}</p> : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-lg text-red-500">{error}</p>
                <Button onClick={() => router.push('/products')}>Volver a Productos</Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Editar Producto</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Modifica la informacion del producto</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Informacion Basica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">SKU *</Label>
                                <Input {...register('sku')} className="mt-1" />
                                <FieldError msg={errors.sku?.message} />
                            </div>
                            <div>
                                <Label className="text-xs">ASIN</Label>
                                <Input {...register('asin')} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Nombre *</Label>
                            <Input {...register('name')} className="mt-1" />
                            <FieldError msg={errors.name?.message} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs">Categoria</Label>
                                <Select
                                    value={w.category || ''}
                                    onValueChange={(v) => setValue('category', v as any)}
                                >
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {['Electronics', 'Toys', 'Home', 'Kitchen', 'Health', 'Beauty', 'Sports', 'Books', 'Other'].map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Marketplace</Label>
                                <Select
                                    value={w.marketplace || 'US'}
                                    onValueChange={(v) => setValue('marketplace', v as any)}
                                >
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['US', 'MX', 'CA', 'UK', 'DE', 'FR', 'IT', 'ES'].map((m) => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Peso (kg)</Label>
                                <Input type="number" step="0.01" {...register('weightKg', { valueAsNumber: true })} className="mt-1" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Costos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                ['Costo Unitario *', 'unitCost'],
                                ['Envio', 'shippingCost'],
                                ['Prep', 'prepCost'],
                                ['Impuestos', 'taxes'],
                            ].map(([label, field]) => (
                                <div key={field}>
                                    <Label className="text-xs">{label}</Label>
                                    <Input type="number" step="0.01" {...register(field as any, { valueAsNumber: true })} className="mt-1" />
                                </div>
                            ))}
                            <div className="p-3 rounded-xl bg-muted mt-2">
                                <p className="text-sm font-semibold text-foreground">Total: {fmt(metrics.totalCost)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Precio y Tarifas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                ['Precio Venta *', 'salePrice'],
                                ['Tarifa Referencia', 'referralFee'],
                                ['Tarifa FBA', 'fbaFee'],
                                ['Almacenamiento/mes', 'storageFeeMonthly'],
                            ].map(([label, field]) => (
                                <div key={field}>
                                    <Label className="text-xs">{label}</Label>
                                    <Input type="number" step="0.01" {...register(field as any, { valueAsNumber: true })} className="mt-1" />
                                </div>
                            ))}
                            <div className="p-3 rounded-xl bg-muted mt-2">
                                <p className="text-sm font-semibold text-foreground">Total Tarifas: {fmt(metrics.totalFees)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Estado y Notas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Estado</Label>
                                <Select
                                    value={w.status || 'active'}
                                    onValueChange={(v) => setValue('status', v as any)}
                                >
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="paused">Pausado</SelectItem>
                                        <SelectItem value="discontinued">Descontinuado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Notas</Label>
                            <textarea
                                {...register('notes')}
                                rows={3}
                                className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                placeholder="Notas internas sobre el producto..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="glow-sm">
                    <CardContent className="p-5">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 rounded-xl bg-[hsl(var(--metric-green-bg))]">
                                <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--metric-green))]">Ganancia</p>
                                <p className="text-xl font-bold text-[hsl(var(--metric-green))] mt-1">{fmt(metrics.netProfit)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[hsl(var(--metric-blue-bg))]">
                                <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--metric-blue))]">ROI</p>
                                <p className="text-xl font-bold text-[hsl(var(--metric-blue))] mt-1">{fmtPct(metrics.roi)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[hsl(var(--metric-purple-bg))]">
                                <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--metric-purple))]">Margen</p>
                                <p className="text-xl font-bold text-[hsl(var(--metric-purple))] mt-1">{fmtPct(metrics.margin)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Guardando...' : 'Actualizar Producto'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                </div>
            </form>
        </div>
    );
}
