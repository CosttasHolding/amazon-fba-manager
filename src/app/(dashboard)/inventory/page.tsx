'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductWithInventory } from '@/types';
import { stockColor } from '@/lib/utils';
import { Package, Search, AlertTriangle, TrendingDown, Archive, RefreshCw } from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch('/api/inventory?' + params.toString());
      const json = await res.json();
      setInventory(json.data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  const totalUnits = inventory.reduce(
    (sum, p) => sum + (p.stock_available || 0) + (p.stock_inbound || 0) + (p.stock_warehouse || 0),
    0
  );
  const lowStockCount = inventory.filter((p) => p.stock_status === 'low_stock').length;
  const outOfStockCount = inventory.filter((p) => p.stock_status === 'out_of_stock').length;
  const overstockCount = inventory.filter((p) => p.stock_status === 'overstock').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
        <p className="text-sm text-muted-foreground mt-1">Control de stock de tus productos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Unidades</p>
                <p className="text-xl font-bold text-foreground">{totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Bajo</p>
                <p className="text-xl font-bold text-foreground">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sin Stock</p>
                <p className="text-xl font-bold text-foreground">{outOfStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Archive className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exceso Stock</p>
                <p className="text-xl font-bold text-foreground">{overstockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Button variant="outline" onClick={fetchInventory} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Disponible</TableHead>
                  <TableHead className="text-center">En Transito</TableHead>
                  <TableHead className="text-center">Warehouse</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Cargando inventario...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No hay datos de inventario</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((p) => {
                    const total = (p.stock_available || 0) + (p.stock_inbound || 0) + (p.stock_warehouse || 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell className="text-center">{p.stock_available || 0}</TableCell>
                        <TableCell className="text-center">{p.stock_inbound || 0}</TableCell>
                        <TableCell className="text-center">{p.stock_warehouse || 0}</TableCell>
                        <TableCell className="text-center font-bold">{total}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={stockColor(p.stock_status || 'normal')}>
                            {(p.stock_status || 'normal').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando inventario...</p>
              </div>
            </CardContent>
          </Card>
        ) : inventory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay datos de inventario</p>
            </CardContent>
          </Card>
        ) : (
          inventory.map((p) => {
            const total = (p.stock_available || 0) + (p.stock_inbound || 0) + (p.stock_warehouse || 0);
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm text-foreground">{p.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <Badge className={stockColor(p.stock_status || 'normal')}>
                      {(p.stock_status || 'normal').replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Disponible</p>
                      <p className="font-bold text-sm">{p.stock_available || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transito</p>
                      <p className="font-bold text-sm">{p.stock_inbound || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Warehouse</p>
                      <p className="font-bold text-sm">{p.stock_warehouse || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold text-sm text-primary">{total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
