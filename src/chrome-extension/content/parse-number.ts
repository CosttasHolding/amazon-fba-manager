export function parseLocalizedNumber(text: string): number | null {
  const match = text.match(/(\d[\d.,]*)(?:\s*([KMB]))?/i);
  if (!match) return null;

  const cleaned = match[1];
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;
  let num: number;
  if (hasComma && hasDot) {
    const normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
    num = parseFloat(normalized);
  } else if (hasDot) {
    const decimals = cleaned.length - lastDot - 1;
    num = decimals >= 3 ? parseFloat(cleaned.replace(/\./g, "")) : parseFloat(cleaned);
  } else if (hasComma) {
    const decimals = cleaned.length - lastComma - 1;
    num = decimals >= 3 ? parseFloat(cleaned.replace(/,/g, "")) : parseFloat(cleaned.replace(",", "."));
  } else {
    num = parseFloat(cleaned);
  }

  if (isNaN(num)) return null;
  const multiplier = { K: 1e3, M: 1e6, B: 1e9 }[match[2]?.toUpperCase() ?? ""] ?? 1;
  return num * multiplier;
}
