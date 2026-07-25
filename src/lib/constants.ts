// ============================================
// Domain Constants — Centralized
// ============================================

export const MARKETPLACES = [
  { value: "US", label: "US" },
  { value: "MX", label: "MX" },
  { value: "CA", label: "CA" },
  { value: "UK", label: "UK" },
  { value: "DE", label: "DE" },
  { value: "FR", label: "FR" },
  { value: "IT", label: "IT" },
  { value: "ES", label: "ES" },
] as const;

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Toys",
  "Home",
  "Kitchen",
  "Health",
  "Beauty",
  "Sports",
  "Books",
  "Other",
] as const;

export const PRODUCT_STATUS_VALUES = ["active", "paused", "discontinued"] as const;

export const MARKETPLACE_VALUES = ["US", "MX", "CA", "UK", "DE", "FR", "IT", "ES"] as const;

export const PRODUCT_STATUSES = [
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Descontinuado" },
] as const;

export const STOCK_STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "normal", label: "Normal" },
  { value: "low_stock", label: "Stock Bajo" },
  { value: "out_of_stock", label: "Sin Stock" },
  { value: "overstock", label: "Sobrestock" },
];

// ============================================
// Business Rules / Thresholds
// ============================================

export const DEFAULT_PAGE_SIZE = 10;
export const CSV_MAX_SIZE_MB = 5;
export const CSV_MAX_ROWS = 1000;
