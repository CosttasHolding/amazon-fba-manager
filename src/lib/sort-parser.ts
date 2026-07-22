type SortMapping = Record<string, { column: string; ascending: boolean }>;

const DEFAULT_SORT = { column: "created_at", ascending: false };

export function parseSort(sort: string | null, mapping: SortMapping, defaultSort = DEFAULT_SORT): { column: string; ascending: boolean } {
  if (!sort || !mapping[sort]) return defaultSort;
  return mapping[sort];
}

export const PRODUCTS_SORT_MAP: SortMapping = {
  oldest: { column: "created_at", ascending: true },
  name_asc: { column: "name", ascending: true },
  name_desc: { column: "name", ascending: false },
  price_asc: { column: "sale_price", ascending: true },
  price_desc: { column: "sale_price", ascending: false },
  profit_asc: { column: "net_profit", ascending: true },
  profit_desc: { column: "net_profit", ascending: false },
  roi_asc: { column: "roi", ascending: true },
  roi_desc: { column: "roi", ascending: false },
  stock_asc: { column: "stock_available", ascending: true },
  stock_desc: { column: "stock_available", ascending: false },
};

const SALES_SORT_MAP: SortMapping = {
  date_asc: { column: "sale_date", ascending: true },
  date_desc: { column: "sale_date", ascending: false },
  revenue_asc: { column: "revenue", ascending: true },
  revenue_desc: { column: "revenue", ascending: false },
  units_asc: { column: "units_sold", ascending: true },
  units_desc: { column: "units_sold", ascending: false },
};

const SALES_DEFAULT_SORT = { column: "sale_date", ascending: false };

export const INVENTORY_SORT_MAP: SortMapping = {
  name_asc: { column: "name", ascending: true },
  name_desc: { column: "name", ascending: false },
  stock_asc: { column: "stock_available", ascending: true },
  stock_desc: { column: "stock_available", ascending: false },
  available_asc: { column: "stock_available", ascending: true },
  available_desc: { column: "stock_available", ascending: false },
  days_asc: { column: "days_of_stock", ascending: true },
  days_desc: { column: "days_of_stock", ascending: false },
};

export const INVENTORY_DEFAULT_SORT = { column: "name", ascending: true };

export type SalesMemorySort = "profit_asc" | "profit_desc" | null;

export function parseSalesSort(sort: string | null): { column: string; ascending: boolean; memorySort: SalesMemorySort } {
  if (sort === "profit_asc") return { column: "sale_date", ascending: false, memorySort: "profit_asc" };
  if (sort === "profit_desc") return { column: "sale_date", ascending: false, memorySort: "profit_desc" };
  return { ...parseSort(sort, SALES_SORT_MAP, SALES_DEFAULT_SORT), memorySort: null };
}
