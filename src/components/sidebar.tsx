"use client";

import Link from "next/link";
/* logo uses native img to avoid CSP issues */
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { navItems } from "@/lib/navigation";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";
import { OrgSwitcher } from "@/components/org-switcher";

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();
  const { logout, loggingOut } = useAuth();
  const { locale } = useLocale();

  const isActive = useCallback((href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }, [pathname]);

  const getInitial = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    if (userEmail) return userEmail.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <nav aria-label={t("accessibility.toggle_sidebar", locale)} className="hidden lg:flex w-64 flex-col fixed h-screen bg-card border-e border-border z-40">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo_solo.png"
            alt="CosttasHolding"
            width={40}
            height={32}
            className="rounded-lg object-contain"
          />
          <div>
            <p className="text-sm font-bold text-foreground font-display tracking-tight leading-tight">
              CosttasHolding
            </p>
            <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase font-display">
              Manager
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 mb-2">
        <OrgSwitcher />
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
                "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group " +
                (active
                  ? "text-primary bg-primary/[0.08]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
              }
            >
              {active && (
                <div className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-e-full bg-primary" />
              )}
              <item.icon
                className={
                  "w-[18px] h-[18px] transition-colors duration-200 " +
                  (active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")
                }
              />
              <span className="text-sm font-medium font-body">{t(`nav.${item.href.replace("/", "").replace(/-/g, "_")}`, locale) || item.label}</span>
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
              {userName || t("header.user", locale)}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {userEmail || ""}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          aria-label={t("accessibility.logout", locale)}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium font-body">
            {loggingOut ? t("header.logging_out", locale) : t("header.logout", locale)}
          </span>
        </button>
      </div>
    </nav>
  );
}
