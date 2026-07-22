import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ProductWithInventory, Sale, DashboardResponse } from "@/types";
import type { PaginatedResponse } from "@/lib/api-handler";
import { useLocale } from "@/lib/i18n/locale-context";

interface Pagination {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  errorRetryCount: 3,
  refreshInterval: 0,
  shouldRetryOnError: true,
};

/* ─── Legacy hooks (backward compatible) ─── */

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR("/api/products", fetcher, SWR_CONFIG);
  const paginated = data as PaginatedResponse<ProductWithInventory> | undefined;
  return {
    products: (paginated?.data || []) as ProductWithInventory[],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useInventory() {
  const { data, error, isLoading, mutate } = useSWR("/api/inventory", fetcher, SWR_CONFIG);
  const paginated = data as PaginatedResponse<ProductWithInventory> | undefined;
  return {
    inventory: (paginated?.data || []) as ProductWithInventory[],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useSales() {
  const { data, error, isLoading, mutate } = useSWR("/api/sales", fetcher, SWR_CONFIG);
  return {
    sales: (((data as { data?: Sale[] })?.data) || []) as Sale[],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useDashboard() {
  const { locale } = useLocale();
  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(`/api/dashboard?locale=${locale}`, fetcher, {
    ...SWR_CONFIG,
    dedupingInterval: 30000,
    refreshInterval: 120000,
  });
  return {
    data: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/* ─── Products (server-side paginated) ─── */

export interface ProductsQueryParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  stockStatus?: string;
  category?: string;
  marketplace?: string;
  priceMin?: string;
  priceMax?: string;
  roiMin?: string;
  roiMax?: string;
  sort?: string;
}

function buildProductsUrl(params: ProductsQueryParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  if (params.stockStatus) sp.set("stockStatus", params.stockStatus);
  if (params.category) sp.set("category", params.category);
  if (params.marketplace) sp.set("marketplace", params.marketplace);
  if (params.priceMin) sp.set("priceMin", params.priceMin);
  if (params.priceMax) sp.set("priceMax", params.priceMax);
  if (params.roiMin) sp.set("roiMin", params.roiMin);
  if (params.roiMax) sp.set("roiMax", params.roiMax);
  if (params.sort) sp.set("sort", params.sort);
  const qs = sp.toString();
  return `/api/products${qs ? `?${qs}` : ""}`;
}

export function useProductsQuery(params: ProductsQueryParams) {
  const url = buildProductsUrl(params);
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<ProductWithInventory>>(
    url,
    fetcher,
    SWR_CONFIG
  );
  return {
    products: data?.data || [],
    pagination: data?.pagination || { total: 0, page: 1, perPage: 20, totalPages: 0 },
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export interface ProductSummary {
  totalCount: number;
  activeCount: number;
  avgRoi: number;
  totalProfit: number;
  avgPrice: number;
  categories: string[];
}

export function useProductSummary() {
  const { data, error, isLoading } = useSWR<ProductSummary>("/api/products/summary", fetcher, SWR_CONFIG);
  return {
    summary: data || { totalCount: 0, activeCount: 0, avgRoi: 0, totalProfit: 0, avgPrice: 0, categories: [] },
    isLoading,
    isError: !!error,
    error,
  };
}

/* ─── Inventory (server-side paginated) ─── */

export interface InventoryQueryParams {
  page?: number;
  perPage?: number;
  search?: string;
  stockStatus?: string;
  availableMin?: string;
  availableMax?: string;
  sort?: string;
}

function buildInventoryUrl(params: InventoryQueryParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  if (params.search) sp.set("search", params.search);
  if (params.stockStatus) sp.set("stockStatus", params.stockStatus);
  if (params.availableMin) sp.set("availableMin", params.availableMin);
  if (params.availableMax) sp.set("availableMax", params.availableMax);
  if (params.sort) sp.set("sort", params.sort);
  const qs = sp.toString();
  return `/api/inventory${qs ? `?${qs}` : ""}`;
}

export function useInventoryQuery(params: InventoryQueryParams) {
  const url = buildInventoryUrl(params);
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<ProductWithInventory>>(
    url,
    fetcher,
    SWR_CONFIG
  );
  return {
    inventory: data?.data || [],
    pagination: data?.pagination || { total: 0, page: 1, perPage: 20, totalPages: 0 },
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export interface InventorySummary {
  totalCount: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
}

export function useInventorySummary() {
  const { data, error, isLoading } = useSWR<InventorySummary>("/api/inventory/summary", fetcher, SWR_CONFIG);
  return {
    summary: data || { totalCount: 0, totalUnits: 0, lowStockCount: 0, outOfStockCount: 0, overstockCount: 0 },
    isLoading,
    isError: !!error,
    error,
  };
}

/* ─── Sales (server-side paginated) ─── */

export interface SalesQueryParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  revenueMin?: string;
  revenueMax?: string;
  profitMin?: string;
  profitMax?: string;
  sort?: string;
}

function buildSalesUrl(params: SalesQueryParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  if (params.revenueMin) sp.set("revenueMin", params.revenueMin);
  if (params.revenueMax) sp.set("revenueMax", params.revenueMax);
  if (params.profitMin) sp.set("profitMin", params.profitMin);
  if (params.profitMax) sp.set("profitMax", params.profitMax);
  if (params.sort) sp.set("sort", params.sort);
  const qs = sp.toString();
  return `/api/sales${qs ? `?${qs}` : ""}`;
}

export function useSalesQuery(params: SalesQueryParams) {
  const url = buildSalesUrl(params);
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Sale>>(url, fetcher, SWR_CONFIG);
  return {
    sales: data?.data || [],
    pagination: data?.pagination || { total: 0, page: 1, perPage: 50, totalPages: 0 },
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export interface SalesSummary {
  totalRevenue: number;
  totalUnits: number;
  totalFees: number;
  totalProfit: number;
}

export function useSalesSummary() {
  const { data, error, isLoading } = useSWR<SalesSummary>("/api/sales/summary", fetcher, SWR_CONFIG);
  return {
    summary: data || { totalRevenue: 0, totalUnits: 0, totalFees: 0, totalProfit: 0 },
    isLoading,
    isError: !!error,
    error,
  };
}

// ============================================
// FASE 4 - Automation & Alerts Hooks
// ============================================

import { AlertRule, AlertHistory, ScheduledReport, ReorderRuleWithProduct } from "@/types";

export function useAlertRules() {
  const { data, error, isLoading, mutate } = useSWR<{ data: AlertRule[] }>("/api/alerts/rules", fetcher, SWR_CONFIG);
  return {
    rules: data?.data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useAlertHistory(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR<{ data: AlertHistory[] }>(`/api/alerts/history?limit=${limit}`, fetcher, SWR_CONFIG);
  return {
    history: data?.data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useScheduledReports() {
  const { data, error, isLoading, mutate } = useSWR<{ data: ScheduledReport[] }>("/api/schedules", fetcher, SWR_CONFIG);
  return {
    reports: data?.data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useReorderRules() {
  const { data, error, isLoading, mutate } = useSWR<{ data: ReorderRuleWithProduct[] }>("/api/reorder-rules", fetcher, SWR_CONFIG);
  return {
    rules: data?.data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// ============================================
// FASE 5 - Audit Log Hook
// ============================================

import { AuditLogEntry } from "@/types";

export function useAuditLog(entity?: string, action?: string) {
  const params = new URLSearchParams();
  if (entity) params.set("entity", entity);
  if (action) params.set("action", action);
  const qs = params.toString();
  const { data, error, isLoading, mutate } = useSWR<{ data: AuditLogEntry[] }>(
    `/api/audit-log${qs ? `?${qs}` : ""}`,
    fetcher,
    SWR_CONFIG
  );
  return {
    log: data?.data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
