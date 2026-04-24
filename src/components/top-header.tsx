"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { HelpButton } from "@/components/help-button";
import { createClient } from "@/lib/supabase/client";

interface TopHeaderProps {
  userEmail?: string;
  userName?: string;
}

export function TopHeader({ userEmail, userName }: TopHeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getInitial = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    if (userEmail) return userEmail.charAt(0).toUpperCase();
    return "U";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between h-14 px-8 bg-background/80 backdrop-blur-xl border-b border-border/50">
      {/* Global Search */}
      <GlobalSearch />

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationBell />

        {/* Theme toggle */}
        <ThemeToggle compact />

        {/* Help */}
        <HelpButton />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
            aria-controls="user-menu"
            className="flex items-center gap-2.5 pl-3 border-l border-border/50 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden xl:block">
              <p className="text-xs font-medium text-foreground font-body leading-tight">
                {userName || "Usuario"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {userEmail || ""}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary font-display">
                {getInitial()}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div
              id="user-menu"
              role="menu"
              aria-label="Menu de usuario"
              className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl shadow-black/20 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail || ""}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/settings");
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Mi perfil
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/settings");
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Configuración
                </button>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}