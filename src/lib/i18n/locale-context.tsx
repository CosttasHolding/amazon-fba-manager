"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Locale, Direction, getDirection } from "./translations";
import { createClient } from "@/lib/supabase/client";

interface LocaleContextType {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "es",
  direction: "ltr",
  setLocale: () => {},
});

export function LocaleProvider({ children, initialLocale = "es" }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const direction = getDirection(locale);

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    const dir = getDirection(newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = dir;
    // Persist to DB
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_settings")
          .upsert({
            user_id: user.id,
            language: newLocale,
          }, { onConflict: "user_id" });
      }
    } catch (e) { console.error("Failed to persist locale", e); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("user_settings")
          .select("language")
          .eq("user_id", user.id)
          .single();

        if (data?.language && ["es", "en", "ar"].includes(data.language)) {
          const saved = data.language as Locale;
          setLocaleState(saved);
          const dir = getDirection(saved);
          document.documentElement.lang = saved;
          document.documentElement.dir = dir;
        }
      } catch (e) { console.error("Failed to load locale from DB", e); }
    })();
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, direction, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
