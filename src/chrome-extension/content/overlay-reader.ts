export interface OverlayProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string | null;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales: number | null;
  estimated_monthly_revenue: number | null;
  estimated_fba_fee: number | null;
  seller_count_fba: number | null;
  seller_count_fbm: number | null;
  niche_score: number | null;
  brand: string | null;
  category: string | null;
}

function parseLocalizedNumber(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function extractText(parent: Element, selector: string): string {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || "";
}

function extractNumber(parent: Element, selectors: string[]): number | null {
  for (const selector of selectors) {
    const el = parent.querySelector(selector);
    if (el?.textContent && parseLocalizedNumber(el.textContent) !== null) {
      return parseLocalizedNumber(el.textContent);
    }
  }
  return null;
}

function extractAsinFromRow(row: Element): string | null {
  const link = row.querySelector('a[href*="/dp/"], a[href*="/product/"]');
  const href = link?.getAttribute("href") || "";
  const match = href.match(/\/(?:dp|product)\/([A-Z0-9]{10})/);
  return match?.[1] ?? null;
}

function detectCurrency(text: string): string | null {
  const upper = text.toUpperCase();
  if (upper.includes("ARS")) return "ARS";
  if (upper.includes("EUR") || upper.includes("€")) return "EUR";
  if (upper.includes("GBP") || upper.includes("£")) return "GBP";
  if (upper.includes("CAD") || upper.includes("CA$")) return "CAD";
  if (upper.includes("MXN") || upper.includes("MX$")) return "MXN";
  if (upper.includes("USD") || upper.includes("US$")) return "USD";
  return null;
}

export function readOverlay(container: Element): OverlayProduct[] {
  const rows = container.querySelectorAll(
    'tr, [class*="row"], [class*="product"], [data-asin]'
  );
  const seen = new Set<string>();
  const products: OverlayProduct[] = [];

  for (const row of Array.from(rows)) {
    const asin = row.getAttribute("data-asin") || extractAsinFromRow(row);
    if (!asin || asin.length !== 10 || seen.has(asin)) continue;

    const hasLink = row.querySelector('a[href*="/dp/"], a[href*="/product/"]');
    if (!row.getAttribute("data-asin") && !hasLink) continue;
    seen.add(asin);

    const priceText = extractText(row, '[class*="price"], [class*="Price"]');
    products.push({
      asin,
      title: extractText(row, '[class*="title"], [class*="name"], [class*="Title"], [class*="Name"]'),
      price: priceText ? parseLocalizedNumber(priceText) : null,
      currency: priceText ? detectCurrency(priceText) : null,
      bsr: extractNumber(row, ['[class*="bsr"], [class*="rank"]', '[class*="Rank"], [class*="BSR"]']),
      review_count: extractNumber(row, ['[class*="review"], [class*="Review"]']),
      average_rating: extractNumber(row, ['[class*="rating"], [class*="Rating"]']),
      estimated_monthly_sales: extractNumber(row, ['[class*="sales"], [class*="volume"]', '[class*="Sales"], [class*="Volume"]']),
      estimated_monthly_revenue: extractNumber(row, ['[class*="revenue"], [class*="Revenue"]']),
      estimated_fba_fee: extractNumber(row, ['[class*="fee"], [class*="cost"]', '[class*="Fee"], [class*="Cost"]']),
      seller_count_fba: extractNumber(row, ['[class*="fba-seller"], [class*="fba_seller"], [class*="sellers-fba"]']),
      seller_count_fbm: extractNumber(row, ['[class*="fbm-seller"], [class*="fbm_seller"], [class*="sellers-fbm"]']),
      niche_score: extractNumber(row, ['[class*="niche"], [class*="Niche"]']),
      brand: extractText(row, '[class*="brand"], [class*="Brand"]'),
      category: extractText(row, '[class*="category"], [class*="Category"]'),
    });
  }

  return products;
}
