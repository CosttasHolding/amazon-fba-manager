import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Package,
  LayoutDashboard,
  Warehouse,
  TrendingUp,
  Calculator,
  Settings,
  LogOut,
  Factory,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/sidebar";
import { TopHeader } from "@/components/top-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const handleLogout = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  const userName = user.user_metadata?.full_name || user.user_metadata?.name;

  const mobileNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/products", icon: Package, label: "Productos" },
    { href: "/inventory", icon: Warehouse, label: "Inventario" },
    { href: "/sales", icon: TrendingUp, label: "Ventas" },
    { href: "/suppliers", icon: Factory, label: "Proveedores" },
    { href: "/calculator", icon: Calculator, label: "Calculadora" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar userEmail={user.email} userName={userName} />

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[hsl(225,43%,5%)]/95 backdrop-blur-xl border-t border-slate-800/50 px-2 py-1.5 pb-safe">
        <div className="flex justify-around">
          {mobileNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-slate-600 hover:text-cyan-400 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium font-body">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-foreground font-display">
            FBA Manager
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-200"
              title="Cerrar sesi\u00F3n"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        {/* Desktop Top Header */}
        <TopHeader userEmail={user.email} userName={userName} />

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}