import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  errorRetryCount: 3,
  refreshInterval: 0,
  shouldRetryOnError: true,
};

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR("/api/products", fetcher, SWR_CONFIG);
  return {
    products: (data || []) as any[],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useInventory() {
  const { data, error, isLoading, mutate } = useSWR("/api/inventory", fetcher, SWR_CONFIG);
  return {
    inventory: (data || []) as any[],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useSales() {
  const { data, error, isLoading, mutate } = useSWR("/api/sales", fetcher, SWR_CONFIG);
  return {
    sales: (data || []) as any[],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    ...SWR_CONFIG,
    dedupingInterval: 30000,
  });
  return {
    data: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}