export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
/* logo uses native img to avoid CSP issues */
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/actions/get-org-id";
import "../animations.css";
import "../ui-overrides.css";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar } from "@/components/sidebar";
import { TopHeader } from "@/components/top-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ErrorBoundary } from "@/components/error-boundary";
import { HelpButton } from "@/components/help-button";
import { SkipToContent } from "@/components/skip-to-content";
import { OrgLayout } from "@/components/org-layout";

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

  try { await getOrgId(); } catch (e) { console.error("ERROR getting org ID on mount", e); }

  const handleLogout = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  const authName = user.user_metadata?.full_name || user.user_metadata?.name;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("full_name, avatar_url")
    .eq("user_id", user.id)
    .single();
  const userName = settings?.full_name || authName;
  const avatarUrl = settings?.avatar_url || null;

  return (
    <OrgLayout>
    <div className="min-h-screen bg-background">
      <SkipToContent />
      <Sidebar userEmail={user.email} userName={userName} avatarUrl={avatarUrl} />
      <MobileBottomNav />

      <header role="banner" className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo_solo.png"
            alt="CosttasHolding"
            width={32}
            height={26}
            className="rounded-lg object-contain"
          />
          <div>
            <p className="text-sm font-bold text-foreground font-display leading-none">
              CosttasHolding
            </p>
            <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase font-display">
              Manager
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            title="Configuración"
            aria-label="Configuración"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <ThemeToggle compact />
          <form action={handleLogout}>
            <button
              type="submit"
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all duration-200"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      <main id="main-content" role="main" aria-label="Contenido principal" className="lg:ms-64 min-h-screen pb-24 lg:pb-0">
        <TopHeader userEmail={user.email} userName={userName} avatarUrl={avatarUrl} />
        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      <HelpButton />
    </div>
    </OrgLayout>
  );
}