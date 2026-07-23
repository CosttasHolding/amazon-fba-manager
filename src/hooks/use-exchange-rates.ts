"use client";

import { useState, useEffect, useCallback } from "react";

interface ExchangeRates {
  USD_CNY: number;
  USD_ARS: number;
  CNY_USD: number;
  ARS_USD: number;
  CNY_ARS: number;
  ARS_CNY: number;
  lastUpdated: Date | null;
}

const STORAGE_KEY = "exchange_rates";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

function computeRates(raw: Record<string, number>): ExchangeRates {
  const usdCny = raw.USD_CNY ?? 7.2;
  const usdArs = raw.USD_ARS ?? 1200;
  return {
    USD_CNY: usdCny,
    USD_ARS: usdArs,
    CNY_USD: 1 / usdCny,
    ARS_USD: 1 / usdArs,
    CNY_ARS: usdArs / usdCny,
    ARS_CNY: usdCny / usdArs,
    lastUpdated: new Date(),
  };
}

function loadCached(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...parsed, lastUpdated: new Date(parsed.lastUpdated) };
  } catch {
    return null;
  }
}

function saveCache(rates: ExchangeRates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
  } catch { /* ignore */ }
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(() => loadCached());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "https://open.er-api.com/v6/latest/USD"
      );
      if (!res.ok) throw new Error("Failed to fetch rates");
      const data = await res.json();
      if (data.result !== "success") throw new Error("API error");
      const computed = computeRates(data.rates);
      setRates(computed);
      saveCache(computed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      // Use fallback rates if fetch fails
      if (!rates) {
        const fallback = computeRates({ USD_CNY: 7.2, USD_ARS: 1200 });
        setRates(fallback);
        saveCache(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [rates]);

  // Initial fetch + periodic refresh
  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const convert = useCallback(
    (amount: number, from: string, to: string): number => {
      if (!rates || from === to) return amount;
      const key = `${from}_${to}` as keyof ExchangeRates;
      const rate = rates[key];
      return typeof rate === "number" ? amount * rate : amount;
    },
    [rates]
  );

  return { rates, loading, error, fetchRates, convert };
}
