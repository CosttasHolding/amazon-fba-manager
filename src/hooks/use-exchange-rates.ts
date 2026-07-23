"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ExchangeRates {
  USD_CNY: number;
  USD_ARS: number;
  CNY_USD: number;
  ARS_USD: number;
  CNY_ARS: number;
  ARS_CNY: number;
  lastUpdated: Date | null;
}

function computeRates(usdCny: number, usdArs: number): ExchangeRates {
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

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromDB = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("user_settings")
      .select("rate_usd_cny, rate_usd_ars, rates_updated_at")
      .eq("user_id", user.id)
      .single();

    if (data?.rate_usd_cny && data?.rate_usd_ars) {
      return {
        computed: computeRates(data.rate_usd_cny, data.rate_usd_ars),
        updatedAt: data.rates_updated_at,
      };
    }
    return null;
  }, []);

  const saveToDB = useCallback(async (usdCny: number, usdArs: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        rate_usd_cny: usdCny,
        rate_usd_ars: usdArs,
        rates_updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("Failed to fetch rates");
      const data = await res.json();
      if (data.result !== "success") throw new Error("API error");

      const usdCny = data.rates?.CNY ?? 7.2;
      const usdArs = data.rates?.ARS ?? 1200;
      const computed = computeRates(usdCny, usdArs);
      setRates(computed);
      await saveToDB(usdCny, usdArs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      if (!rates) {
        const fallback = computeRates(7.2, 1200);
        setRates(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [rates, saveToDB]);

  // Load from DB on mount
  useEffect(() => {
    (async () => {
      const cached = await loadFromDB();
      if (cached) {
        setRates(cached.computed);
        // If stale (>30min), refresh in background
        if (cached.updatedAt) {
          const age = Date.now() - new Date(cached.updatedAt).getTime();
          if (age > 30 * 60 * 1000) fetchRates();
        }
      } else {
        fetchRates();
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
