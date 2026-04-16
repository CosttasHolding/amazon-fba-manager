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
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar userEmail={user.email} userName={userName} />

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[hsl(225,43%,5%)]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white font-display leading-none">
              FBA Manager
            </h1>
            <p className="text-[9px] text-cyan-400/50 tracking-[0.15em] uppercase font-display">
              Command Center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pb-24 lg:pb-0">
        {/* Desktop Top Header */}
        <TopHeader userEmail={user.email} userName={userName} />

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}