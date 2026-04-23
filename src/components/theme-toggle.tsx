"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const isDark = theme === "dark";

    if (compact) {
        return (
            <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border hover:bg-accent transition-all duration-200"
                title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                aria-pressed={isDark}
            >
                {isDark ? (
                    <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative flex items-center w-full px-3 py-2.5 rounded-xl transition-all duration-300 group"
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-hover))] flex items-center justify-center transition-all duration-300 group-hover:bg-[hsl(var(--sidebar-active))]">
                        {isDark ? (
                            <Moon className="w-4 h-4 text-indigo-400 transition-transform duration-300 group-hover:-rotate-12" />
                        ) : (
                            <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 group-hover:rotate-45" />
                        )}
                    </div>
                    <span className="text-sm text-[hsl(var(--sidebar-text))] group-hover:text-[hsl(var(--sidebar-text-hover))] transition-colors">
                        {isDark ? "Modo Oscuro" : "Modo Claro"}
                    </span>
                </div>

                {/* Toggle pill con circulito visible */}
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 border border-border ${isDark ? "bg-indigo-500/20" : "bg-amber-500/20"}`}>
                    <div
                        className={`absolute top-[3px] w-4 h-4 rounded-full transition-all duration-300 shadow-md ${
                            isDark
                                ? "left-[3px] bg-indigo-400"
                                : "left-[23px] bg-amber-500"
                        }`}
                    />
                </div>
            </div>
        </button>
    );
}
