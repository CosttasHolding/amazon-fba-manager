"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Package,
  Factory,
  Warehouse,
  TrendingUp,
  Calculator,
  FlaskConical,
  ClipboardList,
  Wallet,
  Ship,
  RotateCcw,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/products", icon: Package, label: "Productos" },
  { href: "/research", icon: FlaskConical, label: "Research" },
  { href: "/suppliers", icon: Factory, label: "Proveed." },
  { href: "/orders", icon: ClipboardList, label: "Pedidos" },
  { href: "/shipments", icon: Ship, label: "Shipments" },
  { href: "/inventory", icon: Warehouse, label: "Inventario" },
  { href: "/sales", icon: TrendingUp, label: "Ventas" },
  { href: "/returns", icon: RotateCcw, label: "Returns" },
  { href: "/finances", icon: Wallet, label: "Finanzas" },
  { href: "/calculator", icon: Calculator, label: "Calc." },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [notifCount, setNotifCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const total =
          (data.notifications?.critical?.length || 0) +
          (data.notifications?.warning?.length || 0) +
          (data.notifications?.info?.length || 0);
        setNotifCount(total);
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
      <div className="flex justify-around overflow-x-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const showBadge = item.href === "/inventory" && notifCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "relative flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition-all duration-200 min-w-0 flex-1 shrink-0 " +
                (active
                  ? "text-primary bg-primary/[0.08]"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {active && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-[2.5px] rounded-full bg-primary animate-scale-in" />
              )}
              <div className="relative">
                <item.icon
                  className={
                    "w-4 h-4 transition-all duration-200 " +
                    (active ? "text-primary scale-110" : "")
                  }
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold leading-none px-0.5 animate-scale-in">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </div>
              <span
                className={
                  "text-[9px] font-medium truncate transition-all duration-200 max-w-[60px] " +
                  (active ? "text-primary font-semibold" : "")
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
