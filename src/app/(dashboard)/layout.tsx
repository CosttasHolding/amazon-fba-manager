import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Package, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/sidebar";
import { TopHeader } from "@/components/top-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ErrorBoundaryWrapper } from "@/components/error-boundary-wrapper";

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
      <Sidebar userEmail={user.email} userName={userName} />
      <MobileBottomNav />

      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <Package className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground font-display leading-none">
              CosttasHolding
            </h1>
            <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-display">
              Manager
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <ThemeToggle compact />
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all duration-200"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="lg:ml-64 min-h-screen pb-24 lg:pb-0">
        <TopHeader userEmail={user.email} userName={userName} />
        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}