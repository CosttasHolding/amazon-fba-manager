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
  listing_health_score: number | null;
}

function parseLocalizedNumber(text: string): number | null {
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
      listing_health_score: null,
    });
  }

  return products;
}

function textOf(el: Element | null): string {
  return el?.textContent?.replace(/\u00a0/g, " ").trim() || "";
}

function parseRank(text: string): number | null {
  const match = text.match(/#\s*([\d.,]+)/);
  return match ? parseLocalizedNumber(match[1]) : null;
}

function valueNearLabel(container: Element, labelText: string): string {
  let labelEl: Element | null = null;
  for (const el of Array.from(container.querySelectorAll("div, span, p"))) {
    if (textOf(el) === labelText || textOf(el) === `${labelText}:`) {
      labelEl = el;
      break;
    }
  }
  if (!labelEl) return "";

  let current: Element | null = labelEl;
  for (let depth = 0; depth < 3 && current; depth++) {
    const value = findNumberLeaf(current);
    if (value !== "") return value;
    current = current.parentElement;
  }
  return "";
}

function findNumberLeaf(root: Element): string {
  const leaves = Array.from(root.querySelectorAll("div, span"))
    .filter((el) => el.children.length === 0)
    .map((el) => textOf(el))
    .filter((t) => t && /[\d.,]/.test(t));
  const value = leaves.find((t) => /^[\d.,]+\s*[Kk]?$/.test(t));
  return value ?? "";
}

function shadowRootOf(container: Element): ShadowRoot | null {
  for (const child of Array.from(container.children)) {
    if (child.shadowRoot) return child.shadowRoot;
  }
  return container.shadowRoot ?? null;
}

export function readH10Summary(container: Element): OverlayProduct[] {
  const root = shadowRootOf(container);
  const scoped = (root ?? container) as Element;
  const rootText = scoped.textContent || "";
  const asinMatch = rootText.match(/Product Summary for "([A-Z0-9]{10})"/);
  const asin = asinMatch?.[1] ?? null;
  if (!asin) return [];

  let bsr: number | null = null;
  let category: string | null = null;
  for (const link of Array.from(scoped.querySelectorAll('a[href*="/gp/bestsellers/"]'))) {
    const cat = textOf(link);
    const block = link.parentElement;
    const rank = block ? parseRank(block.textContent || "") : null;
    if (!cat || rank == null) continue;
    if (bsr == null || rank < bsr) {
      bsr = rank;
      category = cat;
    }
  }

  const lhsText = valueNearLabel(scoped, "Listing Health Score");
  const lhsMatch = lhsText.match(/([\d.,]+)/);
  const listing_health_score = lhsMatch ? parseLocalizedNumber(lhsMatch[1]) : null;

  const unitSalesText = valueNearLabel(scoped, "Unit Sales:");
  const unitSalesMatch = unitSalesText.match(/([\d.,]+)/);
  const estimated_monthly_sales = unitSalesMatch ? parseLocalizedNumber(unitSalesMatch[1]) : null;

  const ratingText = valueNearLabel(scoped, "Current Rating");
  const ratingMatch = ratingText.match(/([\d.,]+)/);
  const average_rating = ratingMatch ? parseLocalizedNumber(ratingMatch[1]) : null;

  return [
    {
      asin,
      title: "",
      price: null,
      currency: null,
      bsr,
      review_count: null,
      average_rating,
      estimated_monthly_sales,
      estimated_monthly_revenue: null,
      estimated_fba_fee: null,
      seller_count_fba: null,
      seller_count_fbm: null,
      niche_score: null,
      brand: null,
      category,
      listing_health_score,
    },
  ];
}
