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
  Boxes,
  SlidersHorizontal,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  labelShort?: string;
}

export interface NavCategory {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const navCategories: NavCategory[] = [
  {
    label: "Operaciones",
    icon: ShoppingCart,
    items: [
      { href: "/sales", icon: TrendingUp, label: "Ventas" },
      { href: "/orders", icon: ClipboardList, label: "Pedidos" },
      { href: "/shipments", icon: Ship, label: "Shipments" },
      { href: "/returns", icon: RotateCcw, label: "Returns" },
      { href: "/inventory", icon: Warehouse, label: "Inventario" },
    ],
  },
  {
    label: "Productos y Sourcing",
    icon: Boxes,
    items: [
      { href: "/products", icon: Package, label: "Productos" },
      { href: "/suppliers", icon: Factory, label: "Proveedores", labelShort: "Proveed." },
      { href: "/research", icon: FlaskConical, label: "Research" },
    ],
  },
  {
    label: "Finanzas y Analytics",
    icon: BarChart3,
    items: [
      { href: "/finances", icon: Wallet, label: "Finanzas" },
      { href: "/forecasting", icon: TrendingUp, label: "Forecasting", labelShort: "Forecast" },
      { href: "/analytics", icon: BarChart3, label: "Analytics" },
      { href: "/ads", icon: Target, label: "PPC" },
      { href: "/calculator", icon: Calculator, label: "Calculadora", labelShort: "Calc." },
    ],
  },
  {
    label: "Herramientas",
    icon: SlidersHorizontal,
    items: [
      { href: "/alerts", icon: Bell, label: "Alertas", labelShort: "Alertas" },
      { href: "/sp-api", icon: Link2, label: "Amazon API", labelShort: "API" },
      { href: "/drive", icon: HardDrive, label: "Google Drive" },
      { href: "/team", icon: Shield, label: "Equipo", labelShort: "Equipo" },
    ],
  },
];

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", labelShort: "Inicio" },
  ...navCategories.flatMap((c) => c.items),
];
