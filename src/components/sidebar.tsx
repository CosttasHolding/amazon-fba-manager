"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Factory,
  Warehouse,
  TrendingUp,
  Calculator,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/products", icon: Package, label: "Productos" },
  { href: "/suppliers", icon: Factory, label: "Proveedores" },
  { href: "/inventory", icon: Warehouse, label: "Inventario" },
  { href: "/sales", icon: TrendingUp, label: "Ventas" },
  { href: "/calculator", icon: Calculator, label: "Calculadora" },
];

const bottomNavItems = [
  { href: "/settings", icon: Settings, label: "Configuraci\u00f3n" },
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
      console.error("Error al cerrar sesi\u00f3n:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col fixed h-screen bg-card border-r border-border z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo_solo.png"
            alt="CosttasHolding"
            className="w-9 h-9 rounded-xl object-contain"
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

      {/* Nav Items */}
      <nav className="flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group
                ${active
                  ? "text-primary bg-primary/[0.08]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <item.icon
                className={`w-[18px] h-[18px] transition-colors duration-200 ${active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                  }`}
              />
              <span className="text-sm font-medium font-body">
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="my-3 mx-3 border-t border-border" />

        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group
                ${active
                  ? "text-primary bg-primary/[0.08]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <item.icon
                className={`w-[18px] h-[18px] transition-colors duration-200 ${active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                  }`}
              />
              <span className="text-sm font-medium font-body">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Section + Logout */}
      <div className="px-3 pb-4 pt-2 border-t border-border space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary font-display">
              {getInitial()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate font-body">
              {userName || "Usuario"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {userEmail || ""}
            </p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium font-body">
            {loggingOut ? "Cerrando..." : "Cerrar sesi\u00f3n"}
          </span>
        </button>
      </div>
    </aside>
  );
}