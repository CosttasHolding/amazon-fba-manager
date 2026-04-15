'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

type ProductForm = z.infer<typeof productSchema>;

export default function NewProductPage() {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            marketplace: 'US', status: 'active',
            unitCost: 0, shippingCost: 0, prepCost: 0, taxes: 0,
            salePrice: 0, referralFee: 0, fbaFee: 0, storageFeeMonthly: 0, otherFees: 0,
        },
    });

    const [saving, setSaving] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const w = watch();
    const metrics = calcMetrics(
        w.unitCost || 0, w.shippingCost || 0, w.prepCost || 0, w.taxes || 0,
        w.salePrice || 0, w.referralFee || 0, w.fbaFee || 0, w.storageFeeMonthly || 0, w.otherFees || 0
    );

    const onSubmit = async (data: ProductForm) => {
        setSaving(true);
        try {
            const res = await fetch('/api/products', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Error al crear producto');
            toast({ title: 'Éxito', description: 'Producto creado correctamente' });
            router.push('/products');
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally { setSaving(false); }
    };

    const FieldError = ({ msg }: { msg?: string }) =>
        msg ? <p className="text-xs text-red-500 dark:text-red-400 mt-1">{msg}</p> : null;

    return (
        <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Nuevo Producto</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Completa la información del producto</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Información Básica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs">Categoría</Label>
                                <Select onValueChange={(v) => setValue('category', v as any)}>
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
                                <Select defaultValue="US" onValueChange={(v) => setValue('marketplace', v as any)}>
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

                <div className="grid grid-cols-2 gap-5">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Costos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                ['Costo Unitario *', 'unitCost'],
                                ['Envío', 'shippingCost'],
                                ['Prep', 'prepCost'],
                                ['Impuestos', 'taxes'],
                            ].map(([label, field]) => (
                                <div key={field}>
                                    <Label className="text-xs">{label}</Label>
                                    <Input type="number" step="0.01" {...register(field as any, { valueAsNumber: true })} className="mt-1" />
                                </div>
                            ))}
                            <div className="p-3 rounded-xl bg-[hsl(var(--subtle-bg))] mt-2">
                                <p className="text-sm font-semibold">Total: {fmt(metrics.totalCost)}</p>
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
                            <div className="p-3 rounded-xl bg-[hsl(var(--subtle-bg))] mt-2">
                                <p className="text-sm font-semibold">Total Tarifas: {fmt(metrics.totalFees)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                        {saving ? 'Guardando...' : 'Guardar Producto'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                </div>
            </form>
        </div>
    );
}