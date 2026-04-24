import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Notification, NotificationPriority, NotificationType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all products with inventory data
    const { data: products } = await supabase
      .from('products_with_inventory')
      .select('*')
      .eq('user_id', user.id);

    const allProducts = products || [];
    const notifications: Notification[] = [];
    const now = new Date().toISOString();

    // --- Generate stock-based notifications ---

    // 1. Out of stock (CRITICAL)
    const outOfStock = allProducts.filter(
      (p) => p.stock_status === 'out_of_stock' && p.status === 'active'
    );
    for (const p of outOfStock) {
      notifications.push({
        id: `oos-${p.id}`,
        type: 'out_of_stock',
        priority: 'critical',
        title: 'Sin stock',
        message: `${p.name} (${p.sku}) no tiene unidades disponibles. Las ventas están detenidas.`,
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        read: false,
        persistent: false,
        created_at: now,
      });
    }

    // 2. Low stock (WARNING)
    const lowStock = allProducts.filter(
      (p) => p.stock_status === 'low_stock' && p.status === 'active'
    );
    for (const p of lowStock) {
      const daysLeft = p.days_of_stock;
      const daysText = daysLeft !== null && daysLeft !== undefined
        ? ` (~${Math.round(daysLeft)} días restantes)`
        : '';
      notifications.push({
        id: `ls-${p.id}`,
        type: 'low_stock',
        priority: 'warning',
        title: 'Stock bajo',
        message: `${p.name} (${p.sku}) tiene ${p.stock_available} uds. por debajo del punto de reorden (${p.reorder_point})${daysText}.`,
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        read: false,
        persistent: false,
        created_at: now,
      });
    }

    // 3. Overstock (INFO)
    const overstock = allProducts.filter(
      (p) => p.stock_status === 'overstock' && p.status === 'active'
    );
    for (const p of overstock) {
      const excess = p.stock_available - (p.max_stock || 0);
      notifications.push({
        id: `os-${p.id}`,
        type: 'overstock',
        priority: 'info',
        title: 'Sobrestock',
        message: `${p.name} (${p.sku}) tiene ${p.stock_available} uds. (${excess > 0 ? `+${excess}` : excess} sobre el máximo de ${p.max_stock}).`,
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        read: false,
        persistent: false,
        created_at: now,
      });
    }

    // 4. Low margin (WARNING) — products with margin < 10%
    const activeWithSales = allProducts.filter(
      (p) => p.status === 'active' && p.sale_price && p.sale_price > 0
    );
    for (const p of activeWithSales) {
      const margin = ((p.net_profit || 0) / p.sale_price) * 100;
      if (margin > 0 && margin < 10) {
        notifications.push({
          id: `lm-${p.id}`,
          type: 'low_margin',
          priority: 'warning',
          title: 'Margen bajo',
          message: `${p.name} (${p.sku}) tiene un margen de solo ${margin.toFixed(1)}%. Considera ajustar precios o costos.`,
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          read: false,
          persistent: false,
          created_at: now,
        });
      }
    }

    // Sort by priority: critical > warning > info > success
    const priorityOrder: Record<NotificationPriority, number> = {
      critical: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    notifications.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    // Read dismissed notification IDs from query param (client-side state)
    const dismissedParam = req.nextUrl.searchParams.get('dismissed');
    const dismissedIds = dismissedParam ? dismissedParam.split(',') : [];

    const filtered = notifications.map((n) => ({
      ...n,
      read: dismissedIds.includes(n.id),
    }));

    const unreadCount = filtered.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications: filtered,
      unread_count: unreadCount,
      total_count: filtered.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}