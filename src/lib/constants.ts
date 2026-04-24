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

export const ROI_EXCELLENT = 50;
export const ROI_HEALTHY = 20;
export const STOCK_CRITICAL_DAYS = 14;
export const STOCK_LOW_DAYS = 30;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_API_PAGE_SIZE = 200;
export const CSV_MAX_SIZE_MB = 5;
export const CSV_MAX_ROWS = 1000;
