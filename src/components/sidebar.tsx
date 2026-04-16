"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Factory,
  Warehouse,
  TrendingUp,
  Calculator,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/products", icon: Package, label: "Productos" },
  { href: "/suppliers", icon: Factory, label: "Proveedores" },
  { href: "/inventory", icon: Warehouse, label: "Inventario" },
  { href: "/sales", icon: TrendingUp, label: "Ventas" },
  { href: "/calculator", icon: Calculator, label: "Calculadora" },
];

const bottomNavItems = [
  { href: "/settings", icon: Settings, label: "Configuraci\u00F3n" },
];

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const getInitial = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    if (userEmail) return userEmail.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col fixed h-screen bg-[hsl(225,43%,5%)] dark:bg-[hsl(225,43%,5%)] border-r border-[hsl(var(--sidebar-border))] z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground font-display tracking-tight">
              FBA Manager
            </h1>
            <p className="text-[10px] text-cyan-400/60 tracking-[0.2em] uppercase font-display">
              Command Center
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, index) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 group
                animate-slide-in-left
                ${active
                  ? "text-cyan-400 bg-cyan-400/[0.05]"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyan-400 shadow-[4px_0_12px_rgba(0,212,255,0.3)]" />
              )}
              <item.icon
                className={`w-[18px] h-[18px] transition-colors duration-200 ${
                  active
                    ? "text-cyan-400"
                    : "text-slate-600 group-hover:text-slate-400"
                }`}
              />
              <span className="text-sm font-medium font-body">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 mx-3 border-t border-white/[0.06]" />

        {/* Settings */}
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
                  ? "text-cyan-400 bg-cyan-400/[0.05]"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }
              `}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyan-400 shadow-[4px_0_12px_rgba(0,212,255,0.3)]" />
              )}
              <item.icon
                className={`w-[18px] h-[18px] transition-colors duration-200 ${
                  active
                    ? "text-cyan-400"
                    : "text-slate-600 group-hover:text-slate-400"
                }`}
              />
              <span className="text-sm font-medium font-body">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <span className="text-xs font-bold text-cyan-400 font-display">
              {getInitial()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate font-body">
              {userName || "Admin User"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {userEmail || "admin@fba.com"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}