"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Locale, Direction, getDirection } from "./translations";

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

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    const dir = getDirection(newLocale);
    try {
      localStorage.setItem("fba-locale", newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = dir;
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fba-locale") as Locale | null;
      if (saved && (saved === "es" || saved === "en" || saved === "ar")) {
        setLocaleState(saved);
        const dir = getDirection(saved);
        document.documentElement.lang = saved;
        document.documentElement.dir = dir;
      }
    } catch {}
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
