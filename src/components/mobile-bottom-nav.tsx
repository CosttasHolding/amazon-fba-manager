"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems, type NavItem } from "@/lib/navigation";
import { useNotifications } from "@/hooks/use-notifications";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";
import { X, MoreHorizontal } from "lucide-react";

const PRIMARY_ITEMS = ["/dashboard", "/products", "/inventory", "/sales", "/more"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { unreadCount, fetchNotifications } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isMoreActive = !PRIMARY_ITEMS.slice(0, -1).some((h) => isActive(h));

  const primaryItems: (NavItem & { isMore?: boolean })[] = [
    navItems.find((i) => i.href === "/dashboard")!,
    navItems.find((i) => i.href === "/products")!,
    navItems.find((i) => i.href === "/inventory")!,
    navItems.find((i) => i.href === "/sales")!,
    {
      href: "/more",
      icon: MoreHorizontal,
      label: "More",
      labelShort: "More",
      isMore: true,
    },
  ];

  const moreItems = navItems.filter((i) => !PRIMARY_ITEMS.includes(i.href));

  return (
    <>
      <nav aria-label={t("accessibility.toggle_sidebar", locale)} className="lg:hidden fixed bottom-0 start-0 end-0 z-50 bg-card/95 border-t border-border px-2 pt-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        <div className="flex items-stretch justify-around">
          {primaryItems.map((item) => {
            const active = item.isMore ? moreOpen || isMoreActive : isActive(item.href);
            const showBadge = item.href === "/inventory" && unreadCount > 0;

            const handleClick = () => {
              if (item.isMore) {
                setMoreOpen((prev) => !prev);
              }
            };

            const content = (
              <>
                {active && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full bg-primary" />
                )}
                <div className="relative">
                  <item.icon
                    className={`w-5 h-5 transition-all duration-200 ${active ? "text-primary scale-110" : ""}`}
                  />
                  {showBadge && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none px-0.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              </>
            );

            const baseClass = `relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 rounded-xl transition-all duration-200 min-h-[48px] ${
              active
                ? "text-primary bg-primary/[0.08]"
                : "text-muted-foreground hover:text-foreground"
            }`;

            if (item.isMore) {
              return (
                <button key="more" onClick={handleClick} className={baseClass}>
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={baseClass}>
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-[73px] start-0 end-0 bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
              <h3 className="text-sm font-semibold text-foreground">{t("nav.short.more_pages", locale) || "Más módulos"}</h3>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-lg hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={t("common.close", locale) || "Cerrar"}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 p-3">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors min-h-[72px] ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {t(`nav.short.${item.href.replace("/", "").replace(/-/g, "_")}`, locale) || item.labelShort || item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
