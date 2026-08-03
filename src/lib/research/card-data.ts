export type SourceData = Record<string, unknown> | null | undefined;

export function numField(sd: SourceData, key: string): number | null {
  const raw = sd?.[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return null;
}

export function fmtCompact(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
