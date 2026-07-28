"use client";

import Link from "next/link";
/* logo uses native img to avoid CSP issues */
import { usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { navItems, navCategories, type NavItem } from "@/lib/navigation";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";
import { OrgSwitcher } from "@/components/org-switcher";

interface SidebarProps {
  userEmail?: string;
  userName?: string;
  avatarUrl?: string | null;
}

function NavItemLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { locale } = useLocale();
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={
        "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group " +
        (isActive
          ? "text-primary bg-primary/[0.08]"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
      }
    >
      {isActive && (
        <div className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-e-full bg-primary" />
      )}
      <item.icon
        className={
          "w-[18px] h-[18px] transition-colors duration-200 " +
          (isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")
        }
      />
      <span className="text-sm font-medium font-body">{t(`nav.${item.href.replace("/", "").replace(/-/g, "_")}`, locale) || item.label}</span>
    </Link>
  );
}

export function Sidebar({ userEmail, userName, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const { logout, loggingOut } = useAuth();
  const { locale } = useLocale();

  const isActive = useCallback((href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }, [pathname]);

  const dashboardItem = useMemo(() => navItems.find((i) => i.href === "/dashboard")!, []);

  const categoryLinks = useMemo(() => navCategories.map((cat) => ({
    cat,
    items: cat.items.map((item) => ({
      item,
      active: isActive(item.href),
    })),
  })), [isActive]);

  return (
    <nav aria-label={t("accessibility.toggle_sidebar", locale)} className="hidden lg:flex w-64 flex-col fixed h-screen bg-card border-e border-border z-40">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo_solo.png"
            alt="CosttasHolding"
            width={40}
            height={32}
            loading="lazy"
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

      <nav className="flex-1 px-3 mt-2 overflow-y-auto">
        <div className="space-y-0.5">
          <NavItemLink item={dashboardItem} isActive={isActive(dashboardItem.href)} />
        </div>
        {categoryLinks.map(({ cat, items }) => (
          <div key={cat.label} className="mt-1">
            <div className="px-3 pt-4 pb-1">
              <div className="flex items-center gap-2">
                <cat.icon className="w-3 h-3.5 text-muted-foreground/40" />
                <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.12em] font-body">
                  {cat.label}
                </span>
              </div>
            </div>
            <div className="space-y-0.5">
              {items.map(({ item, active }) => (
                <NavItemLink key={item.href} item={item} isActive={active} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-border space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <img
            src={avatarUrl || "/logo_solo.png"}
            alt={userName || "User"}
            loading="lazy"
            className="w-8 h-8 rounded-lg object-cover border border-primary/20"
          />
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
