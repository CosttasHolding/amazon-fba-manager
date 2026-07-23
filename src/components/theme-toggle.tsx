"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { Moon, Sun, Eye } from "lucide-react";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { createClient } from "@/lib/supabase/client";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [highContrast, setHighContrast] = useState(false);
    const { locale } = useLocale();

    // Load from DB on mount
    useEffect(() => {
        setMounted(true);
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase
                    .from("user_settings")
                    .select("high_contrast")
                    .eq("user_id", user.id)
                    .single();
                if (data?.high_contrast) {
                    setHighContrast(true);
                    document.documentElement.classList.add("high-contrast");
                }
            } catch {}
        })();
    }, []);

    const toggleHighContrast = useCallback(async () => {
        const next = !highContrast;
        setHighContrast(next);
        if (next) {
            document.documentElement.classList.add("high-contrast");
        } else {
            document.documentElement.classList.remove("high-contrast");
        }
        // Persist to DB
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from("user_settings")
                    .upsert({
                        user_id: user.id,
                        high_contrast: next,
                    }, { onConflict: "user_id" });
            }
        } catch {}
    }, [highContrast]);

    if (!mounted) return null;

    const isDark = theme === "dark";

    if (compact) {
        return (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-card border border-border hover:bg-accent transition-all duration-200"
                    title={isDark ? t("theme.switch_to_light", locale) : t("theme.switch_to_dark", locale)}
                    aria-label={isDark ? t("theme.switch_to_light", locale) : t("theme.switch_to_dark", locale)}
                    aria-pressed={isDark}
                >
                    {isDark ? (
                        <Moon className="w-4 h-4 text-primary" />
                    ) : (
                        <Sun className="w-4 h-4 text-primary" />
                    )}
                </button>
                <button
                    onClick={toggleHighContrast}
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-card border border-border hover:bg-accent transition-all duration-200"
                    title={highContrast ? t("theme.disable_high_contrast", locale) : t("theme.enable_high_contrast", locale)}
                    aria-label={highContrast ? t("theme.disable_high_contrast", locale) : t("theme.enable_high_contrast", locale)}
                    aria-pressed={highContrast}
                >
                    <Eye className={`w-4 h-4 ${highContrast ? "text-primary" : "text-muted-foreground"}`} />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="relative flex items-center w-full px-3 py-2.5 rounded-xl transition-all duration-300 group"
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-hover))] flex items-center justify-center transition-all duration-300 group-hover:bg-[hsl(var(--sidebar-active))]">
                            {isDark ? (
                                <Moon className="w-4 h-4 text-primary transition-transform duration-300 group-hover:-rotate-12" />
                            ) : (
                                <Sun className="w-4 h-4 text-primary transition-transform duration-300 group-hover:rotate-45" />
                            )}
                        </div>
                        <span className="text-sm text-[hsl(var(--sidebar-text))] group-hover:text-[hsl(var(--sidebar-text-hover))] transition-colors">
                            {isDark ? t("theme.dark_mode", locale) : t("theme.light_mode", locale)}
                        </span>
                    </div>

                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 border border-border ${isDark ? "bg-primary/20" : "bg-primary/20"}`}>
                        <div
                            className={`absolute top-[3px] w-4 h-4 rounded-full transition-all duration-300 shadow-md ${
                                isDark
                                    ? "start-[3px] bg-primary"
                                    : "start-[23px] bg-primary"
                            }`}
                        />
                    </div>
                </div>
            </button>

            <button
                onClick={toggleHighContrast}
                className="relative flex items-center w-full px-3 py-2.5 rounded-xl transition-all duration-300 group"
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${highContrast ? "bg-primary/20" : "bg-[hsl(var(--sidebar-hover))] group-hover:bg-[hsl(var(--sidebar-active))]"}`}>
                            <Eye className={`w-4 h-4 transition-transform duration-300 ${highContrast ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                        </div>
                        <span className="text-sm text-[hsl(var(--sidebar-text))] group-hover:text-[hsl(var(--sidebar-text-hover))] transition-colors">
                            {t("theme.high_contrast", locale)}
                        </span>
                    </div>

                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 border border-border ${highContrast ? "bg-primary/20" : "bg-muted"}`}>
                        <div
                            className={`absolute top-[3px] w-4 h-4 rounded-full transition-all duration-300 shadow-md ${
                                highContrast
                                    ? "start-[23px] bg-primary"
                                    : "start-[3px] bg-muted-foreground/50"
                            }`}
                        />
                    </div>
                </div>
            </button>
        </div>
    );
}
