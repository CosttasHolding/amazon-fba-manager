export function parseLocalizedNumber(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;
  if (hasComma && hasDot) {
    const normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }
  if (hasDot) {
    const decimals = cleaned.length - lastDot - 1;
    const num = decimals >= 3 ? parseFloat(cleaned.replace(/\./g, "")) : parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  if (hasComma) {
    const decimals = cleaned.length - lastComma - 1;
    const num = decimals >= 3 ? parseFloat(cleaned.replace(/,/g, "")) : parseFloat(cleaned.replace(",", "."));
    return isNaN(num) ? null : num;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
