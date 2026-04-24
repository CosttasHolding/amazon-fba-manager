import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ProductWithInventory, Sale, DashboardResponse } from "@/types";

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
  return {
    products: (data || []) as ProductWithInventory[],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useInventory() {
  const { data, error, isLoading, mutate } = useSWR("/api/inventory", fetcher, SWR_CONFIG);
  return {
    inventory: (data || []) as ProductWithInventory[],
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
  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>("/api/dashboard", fetcher, {
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

/* ─── Pagination types ─── */

export interface Pagination {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
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

export interface SalesApiResponse {
  data: Sale[];
  count: number;
  page: number;
  limit: number;
}

export function useSalesQuery(params: SalesQueryParams) {
  const url = buildSalesUrl(params);
  const { data, error, isLoading, mutate } = useSWR<SalesApiResponse>(url, fetcher, SWR_CONFIG);
  const pagination: Pagination = {
    total: data?.count || 0,
    page: data?.page || 1,
    perPage: data?.limit || 50,
    totalPages: Math.ceil((data?.count || 0) / (data?.limit || 50)),
  };
  return {
    sales: data?.data || [],
    pagination,
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
