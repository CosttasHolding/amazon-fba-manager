export const CURRENCIES = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "CNY", label: "CNY (¥)", symbol: "¥" },
  { value: "ARS", label: "ARS ($)", symbol: "$" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["value"];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  CNY: "¥",
  ARS: "$",
};
