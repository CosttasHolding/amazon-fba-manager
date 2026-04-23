"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Package,
  Factory,
  Warehouse,
  TrendingUp,
  Calculator,
  FlaskConical,
  ClipboardList,
  LogOut,
  Wallet,
  Ship,
  RotateCcw,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/products", icon: Package, label: "Productos" },
  { href: "/research", icon: FlaskConical, label: "Research" },
  { href: "/suppliers", icon: Factory, label: "Proveedores" },
  { href: "/orders", icon: ClipboardList, label: "Pedidos" },
  { href: "/shipments", icon: Ship, label: "Shipments" },
  { href: "/inventory", icon: Warehouse, label: "Inventario" },
  { href: "/sales", icon: TrendingUp, label: "Ventas" },
  { href: "/returns", icon: RotateCcw, label: "Returns" },
  { href: "/finances", icon: Wallet, label: "Finanzas" },
  { href: "/calculator", icon: Calculator, label: "Calculadora" },
];

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const getInitial = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    if (userEmail) return userEmail.charAt(0).toUpperCase();
    return "U";
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col fixed h-screen bg-card border-r border-border z-40">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <Image
            src="/logo_solo.png"
            alt="CosttasHolding"
            width={40}
            height={32}
            className="rounded-lg object-contain"
          />
          <div>
            <h1 className="text-sm font-bold text-foreground font-display tracking-tight leading-tight">
              CosttasHolding
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase font-display">
              Manager
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group " +
                (active
                  ? "text-primary bg-primary/[0.08]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
              }
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <item.icon
                className={
                  "w-[18px] h-[18px] transition-colors duration-200 " +
                  (active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")
                }
              />
              <span className="text-sm font-medium font-body">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-border space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary font-display">{getInitial()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate font-body">
              {userName || "Usuario"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {userEmail || ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Cerrar sesión"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium font-body">
            {loggingOut ? "Cerrando..." : "Cerrar sesion"}
          </span>
        </button>
      </div>
    </aside>
  );
}
