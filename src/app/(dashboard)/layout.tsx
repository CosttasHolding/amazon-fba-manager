import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/sidebar";
import { TopHeader } from "@/components/top-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ErrorBoundaryWrapper } from "@/components/error-boundary-wrapper";
import { HelpButton } from "@/components/help-button";

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:font-medium"
      >
        Saltar al contenido principal
      </a>
      <Sidebar userEmail={user.email} userName={userName} />
      <MobileBottomNav />

      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo_solo.png"
            alt="CosttasHolding"
            width={32}
            height={26}
            className="rounded-lg object-contain"
          />
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
          <HelpButton />
          <Link
            href="/settings"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            title="Configuración"
            aria-label="Configuración"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <ThemeToggle compact />
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all duration-200"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      <main id="main-content" className="lg:ml-64 min-h-screen pb-24 lg:pb-0">
        <TopHeader userEmail={user.email} userName={userName} />
        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}