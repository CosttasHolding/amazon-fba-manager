import {
  LayoutDashboard,
  Package,
  Factory,
  Warehouse,
  TrendingUp,
  BarChart3,
  Calculator,
  FlaskConical,
  ClipboardList,
  Wallet,
  Ship,
  RotateCcw,
  Target,
  Link2,
  HardDrive,
  Users,
  CheckSquare,
  Bell,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  labelShort?: string;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", labelShort: "Inicio" },
  { href: "/sales", icon: TrendingUp, label: "Ventas" },
  { href: "/inventory", icon: Warehouse, label: "Inventario" },
  { href: "/products", icon: Package, label: "Productos" },
  { href: "/orders", icon: ClipboardList, label: "Pedidos" },
  { href: "/shipments", icon: Ship, label: "Shipments" },
  { href: "/returns", icon: RotateCcw, label: "Returns" },
  { href: "/finances", icon: Wallet, label: "Finanzas" },
  { href: "/ads", icon: Target, label: "PPC" },
  { href: "/suppliers", icon: Factory, label: "Proveedores", labelShort: "Proveed." },
  { href: "/research", icon: FlaskConical, label: "Research" },
  { href: "/forecasting", icon: TrendingUp, label: "Forecasting", labelShort: "Forecast" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/alerts", icon: Bell, label: "Alertas", labelShort: "Alertas" },
  { href: "/calculator", icon: Calculator, label: "Calculadora", labelShort: "Calc." },
  { href: "/sp-api", icon: Link2, label: "Amazon API", labelShort: "API" },
  { href: "/drive", icon: HardDrive, label: "Google Drive" },
  { href: "/team", icon: Shield, label: "Equipo", labelShort: "Equipo" },
];
