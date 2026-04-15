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
import { Card, CardContent } from '@/components/ui/card';
import { fmt } from '@/lib/utils';
import { DollarSign, TrendingUp, ShoppingCart, BarChart3 } from 'lucide-react';

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sales')
      .then((r) => r.json())
      .then((d) => {
        setSales(d.data || []);
        setLoading(false);
      });
  }, []);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.sale_price || 0) * (s.units_sold || 0), 0);
  const totalUnits = sales.reduce((sum, s) => sum + (s.units_sold || 0), 0);
  const totalFees = sales.reduce((sum, s) => sum + (s.amazon_fees || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
        <p className="text-sm text-muted-foreground mt-1">Historial de ventas de tus productos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue Total</p>
                <p className="text-xl font-bold text-foreground">{fmt(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit Total</p>
                <p className="text-xl font-bold text-foreground">{fmt(totalProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unidades</p>
                <p className="text-xl font-bold text-foreground">{totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10">
                <BarChart3 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fees Amazon</p>
                <p className="text-xl font-bold text-foreground">{fmt(totalFees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla Desktop */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Unidades</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Tarifas Amazon</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Cargando ventas...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No hay ventas registradas</p>
                        <p className="text-xs text-muted-foreground/60">Las ventas apareceran aqui cuando se registren</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.sale_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{s.products?.name || 'N/A'}</TableCell>
                      <TableCell className="text-center">{s.units_sold}</TableCell>
                      <TableCell className="text-right">{fmt((s.sale_price || 0) * (s.units_sold || 0))}</TableCell>
                      <TableCell className="text-right text-red-500">{fmt(s.amazon_fees)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-500">{fmt(s.profit)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Cards Mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">Cargando ventas...</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay ventas registradas</p>
            </CardContent>
          </Card>
        ) : (
          sales.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{s.products?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.sale_date).toLocaleDateString()}</p>
                  </div>
                  <p className="font-bold text-emerald-500">{fmt(s.profit)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Unidades</p>
                    <p className="font-bold text-sm">{s.units_sold}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="font-bold text-sm">{fmt((s.sale_price || 0) * (s.units_sold || 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fees</p>
                    <p className="font-bold text-sm text-red-500">{fmt(s.amazon_fees)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}