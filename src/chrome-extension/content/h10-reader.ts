export interface H10ProductData {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales: number | null;
  estimated_monthly_revenue: number | null;
  estimated_fba_fee: number | null;
  seller_count_fba: number | null;
  seller_count_fbm: number | null;
}

export function readH10Overlay(container: Element): H10ProductData[] {
  const products: H10ProductData[] = [];
  const rows = container.querySelectorAll("tr, [class*='row'], [class*='product']");

  rows.forEach((row) => {
    const asin = row.getAttribute("data-asin") || extractAsinFromRow(row);
    if (!asin) return;

    products.push({
      asin,
      title: extractText(row, '[class*="title"], [class*="name"]'),
      price: extractNumber(row, '[class*="price"]'),
      bsr: extractNumber(row, '[class*="bsr"], [class*="rank"]'),
      review_count: extractNumber(row, '[class*="review"]'),
      average_rating: extractNumber(row, '[class*="rating"]'),
      estimated_monthly_sales: extractNumber(row, '[class*="sales"], [class*="volume"]'),
      estimated_monthly_revenue: extractNumber(row, '[class*="revenue"]'),
      estimated_fba_fee: extractNumber(row, '[class*="fee"], [class*="cost"]'),
      seller_count_fba: extractNumber(row, '[class*="fba-seller"]'),
      seller_count_fbm: extractNumber(row, '[class*="fbm-seller"]'),
    });
  });

  return products;
}

function extractText(parent: Element, selector: string): string {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || "";
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

function extractNumber(parent: Element, selector: string): number | null {
  const el = parent.querySelector(selector);
  if (!el?.textContent) return null;
  return parseLocalizedNumber(el.textContent);
}

function extractAsinFromRow(row: Element): string | null {
  const link = row.querySelector('a[href*="/dp/"], a[href*="/product/"]');
  const href = link?.getAttribute("href") || "";
  const match = href.match(/\/(?:dp|product)\/([A-Z0-9]{10})/);
  return match?.[1] ?? null;
}
