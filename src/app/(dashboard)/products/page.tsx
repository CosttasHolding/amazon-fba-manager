'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { fmt, fmtPct, roiColor, profitColor } from '@/lib/utils';
import { Search, Plus, Download } from 'lucide-react';

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/products')
            .then((r) => r.json())
            .then((d) => {
                setProducts(d.data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = products.filter(
        (p) =>
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.sku?.toLowerCase().includes(search.toLowerCase()) ||
            p.asin?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Productos</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {products.length} producto{products.length !== 1 ? 's' : ''} registrado{products.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Exportar</span>
                    </Button>
                    <Button size="sm" onClick={() => router.push('/products/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Nuevo Producto</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                </div>
            </div>

            {/* Mobile: Cards view */}
            <div className="lg:hidden space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-center py-12 text-muted-foreground">
                        {search ? 'Sin resultados' : 'No hay productos'}
                    </p>
                ) : (
                    filtered.map((product) => (
                        <Card
                            key={product.id}
                            className="cursor-pointer active:scale-[0.98] transition-transform"
                            onClick={() => router.push(`/products/${product.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-medium text-sm">{product.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                                    </div>
                                    <Badge
                                        variant={product.status === 'active' ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {product.status}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Precio</p>
                                        <p className="text-sm font-medium">{fmt(product.sale_price)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ganancia</p>
                                        <p className={`text-sm font-medium ${profitColor(product.net_profit)}`}>
                                            {fmt(product.net_profit)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI</p>
                                        <p className={`text-sm font-medium ${roiColor(product.roi)}`}>
                                            {fmtPct(product.roi)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Desktop: Table view */}
            <Card className="hidden lg:block">
                <div className="p-5 border-b border-border">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, SKU o ASIN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-muted-foreground">Cargando...</p>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <p className="text-muted-foreground">
                                {search ? 'Sin resultados' : 'No hay productos aún'}
                            </p>
                            {!search && (
                                <Button size="sm" variant="outline" onClick={() => router.push('/products/new')}>
                                    Crear primero
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">Ganancia</TableHead>
                                    <TableHead className="text-right">ROI</TableHead>
                                    <TableHead className="text-center">Stock</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right"> </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((product) => (
                                    <TableRow
                                        key={product.id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/products/${product.id}`)}
                                    >
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {product.sku}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-sm">{product.name}</p>
                                                {product.asin && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {product.asin}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {product.category || '—'}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {fmt(product.sale_price)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {fmt(product.total_cost)}
                                        </TableCell>
                                        <TableCell className={`text-right text-sm font-medium ${profitColor(product.net_profit)}`}>
                                            {fmt(product.net_profit)}
                                        </TableCell>
                                        <TableCell className={`text-right text-sm font-medium ${roiColor(product.roi)}`}>
                                            {fmtPct(product.roi)}
                                        </TableCell>
                                        <TableCell className="text-center text-sm">
                                            {product.stock_available ?? 0}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant={product.status === 'active' ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {product.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-xs">
                                                Ver →
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}