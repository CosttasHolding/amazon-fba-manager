"use client";

import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopHeaderProps {
  userEmail?: string;
  userName?: string;
}

export function TopHeader({ userEmail, userName }: TopHeaderProps) {
  const getInitial = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    if (userEmail) return userEmail.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <header className="hidden lg:flex sticky top-0 z-30 items-center justify-between h-14 px-8 bg-background/80 backdrop-blur-xl border-b border-border/50">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar productos, proveedores..."
          className="w-full h-9 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all font-body"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.04] transition-colors">
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
        </button>

        {/* Theme toggle */}
        <ThemeToggle compact />

        {/* User avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border/50">
          <div className="text-right hidden xl:block">
            <p className="text-xs font-medium text-foreground font-body leading-tight">
              {userName || "Admin User"}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Premium Plan
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <span className="text-xs font-bold text-cyan-400 font-display">
              {getInitial()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}