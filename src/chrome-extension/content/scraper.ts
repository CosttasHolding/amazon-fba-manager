export interface ScrapedProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  category: string | null;
  brand: string | null;
  image_url: string | null;
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/([A-Z0-9]{10})(?:\/|$|\?)/);
  return match?.[1] ?? null;
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

function parsePrice(text: string): number | null {
  return parseLocalizedNumber(text);
}

function parseCountWithK(text: string): number | null {
  const cleaned = text.replace(/[^\d.,Kk]/g, "");
  if (!cleaned) return null;
  const isK = /[Kk]$/.test(text);
  const normalized = isK ? cleaned.replace(/[Kk]/g, "") : cleaned;
  const num = parseLocalizedNumber(normalized);
  return num == null ? null : isK ? Math.round(num * 1000) : Math.round(num);
}

function parseBsr(text: string): number | null {
  const matches = text.match(/(?:nº|#|n°)\s*([\d.,]+)/i);
  const value = matches?.[1] ?? text.match(/([\d.,]+)\s+(?:en|in)\s+/)?.[1];
  return value ? parseLocalizedNumber(value) : null;
}

function parseBsrCategory(text: string): string | null {
  const match = text.match(/en\s+(.+?)(?:\(|\s*$)/i);
  const matchEn = text.match(/in\s+(.+?)(?:\(|\s*$)/i);
  const raw = match?.[1] ?? matchEn?.[1];
  return raw ? raw.replace(/\s*$/, "").trim() : null;
}

function detectCurrency(text: string, hostname: string): string {
  const upper = text.toUpperCase();
  if (upper.includes("ARS")) return "ARS";
  if (upper.includes("EUR") || upper.includes("€")) return "EUR";
  if (upper.includes("GBP") || upper.includes("£")) return "GBP";
  if (upper.includes("CAD") || upper.includes("CA$")) return "CAD";
  if (upper.includes("MXN") || upper.includes("MX$")) return "MXN";
  if (upper.includes("USD") || upper.includes("US$")) return "USD";
  if (hostname.includes("amazon.es")) return "EUR";
  if (hostname.includes("amazon.co.uk")) return "GBP";
  if (hostname.includes("amazon.ca")) return "CAD";
  if (hostname.includes("amazon.com.mx")) return "MXN";
  return "USD";
}

const BADGE_PATTERNS = [
  /deja un comentario sobre el anuncio/i,
  /leave feedback on this ad/i,
  /est\u00e1s viendo este anuncio/i,
  /sponsored|patrocinado/i,
];

function isBadgeText(text: string): boolean {
  return BADGE_PATTERNS.some((re) => re.test(text));
}

function extractTitleCandidates(card: Element): string[] {
  return Array.from(
    card.querySelectorAll("h2 a span, h2 a, .a-link-normal.s-link-style")
  )
    .map((el) => el.textContent?.trim() || "")
    .filter(Boolean);
}

function extractRealTitle(card: Element): string {
  const candidates = extractTitleCandidates(card);
  return (
    candidates.find((t) => !isBadgeText(t) && t.length >= 10) ||
    candidates[0] ||
    ""
  );
}

function outermostAsinCards(): Element[] {
  const all = document.querySelectorAll('[data-asin]:not([data-asin=""])');
  return Array.from(all).filter(
    (el) => !el.parentElement?.closest("[data-asin]")
  );
}

export function scrapeCurrentPage(): ScrapedProduct[] {
  const results: ScrapedProduct[] = [];
  const hostname = window.location.hostname;

  outermostAsinCards().forEach((card) => {
    const asin = card.getAttribute("data-asin") || "";
    if (!asin || asin.length !== 10) return;

    const title = extractRealTitle(card);

    const priceEl = card.querySelector(".a-price .a-offscreen, .a-price span:last-child");
    const priceText = priceEl?.textContent || "";
    const price = priceText ? parsePrice(priceText) : null;

    const ratingEl = card.querySelector("[class*='rating'] i span, .a-icon-alt");
    const ratingText = ratingEl?.textContent || "";
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const average_rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    const reviewAria = card.querySelector('a[aria-label*="valoraciones"], a[aria-label*="ratings"], a[aria-label*="calificaciones"], a[aria-label*="rese\u00f1as"]');
    const reviewAriaMatch = reviewAria?.getAttribute("aria-label")?.match(/([\d.,]+\s*K?)/i);
    const reviewTextEl = card.querySelector("[class*='rating'] ~ [class*='link'] a, [class*='rating'] ~ a, .a-size-mini.puis-normal-weight-text");
    const reviewText = reviewTextEl?.textContent || "";
    const reviewFromText = reviewText.match(/\(([\d.,]+\s*K?)\)/i)?.[1] || "";
    const reviewRaw = reviewAriaMatch?.[1] || reviewFromText;
    const review_count = reviewRaw ? parseCountWithK(reviewRaw) : null;

    const imgEl = card.querySelector("img[src*='images'], img[src*='media']");
    const image_url = imgEl?.getAttribute("src") || null;

    const existing = results.find((r) => r.asin === asin);
    const thisIsBad = !title || isBadgeText(title);
    const existingIsBad =
      !existing || !existing.title || isBadgeText(existing.title);
    if (existing && !thisIsBad && existingIsBad) {
      results[results.indexOf(existing)] = {
        asin,
        title,
        price,
        currency: priceText ? detectCurrency(priceText, hostname) : "USD",
        bsr: null,
        review_count,
        average_rating,
        category: null,
        brand: null,
        image_url,
      };
      return;
    }
    if (existing && thisIsBad) return;

    results.push({
      asin,
      title,
      price,
      currency: priceText ? detectCurrency(priceText, hostname) : "USD",
      bsr: null,
      review_count,
      average_rating,
      category: null,
      brand: null,
      image_url,
    });
  });

  return results;
}

export function scrapeProductPage(): ScrapedProduct | null {
  const asinExtract = extractAsin(window.location.href);
  if (!asinExtract) return null;

  const titleEl = document.querySelector("#productTitle, [class*='product-title']");
  const title = titleEl?.textContent?.trim() || "";

  const priceEl = document.querySelector(".a-price .a-offscreen, #priceblock_ourprice, #price_inside_buybox");
  const priceText = priceEl?.textContent || "";
  const price = priceText ? parsePrice(priceText) : null;

  const bsrEls = document.querySelectorAll(
    "#prodDetails li, #detailBullets_feature_div li, #productDetails_detailBullets_sections1 tr"
  );
  let bsr: number | null = null;
  let bsrCategory: string | null = null;
  bsrEls.forEach((el) => {
    const text = el.textContent || "";
    const parsed = parseBsr(text);
    if (parsed != null) {
      if (bsr == null || parsed < bsr) {
        bsr = parsed;
        bsrCategory = parseBsrCategory(text);
      }
    }
  });

  const ratingEl = document.querySelector(".a-icon-alt");
  const ratingText = ratingEl?.textContent || "";
  const ratingMatch = ratingText.match(/([\d.]+)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

  const reviewCountEl = document.querySelector("#acrCustomerReviewText");
  const reviewText = reviewCountEl?.textContent || "";
  const reviewCountMatch = reviewText.match(/([\d,]+)/);
  const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ""), 10) : null;

  const imgEl = document.querySelector("#landingImage, #imgTagWrapperId img");
  const image_url = imgEl?.getAttribute("src") || null;

  const brandOverviewEl = document.querySelector("#productOverview_feature_div tr.po-brand, #productOverview_feature_div [class*='po-brand']");
  const brandOverview = brandOverviewEl?.textContent || "";
  const brandOverviewMatch = brandOverview.match(/Marca\s*(.+)/i);
  const bylineEl = document.querySelector("#bylineInfo");
  const bylineText = bylineEl?.textContent?.trim() || "";
  const bylineMatch = bylineText.match(/(?:tienda de|store of|by)\s+(.+)$/i);
  const brand = brandOverviewMatch?.[1]?.trim() || bylineMatch?.[1]?.trim() || null;

  const categoryEl = document.querySelector("#wayfinding-breadcrumbs_container ul li:last-child a");
  const category = bsrCategory ?? categoryEl?.textContent?.trim() ?? null;

  return {
    asin: asinExtract,
    title,
    price,
    currency: priceText ? detectCurrency(priceText, window.location.hostname) : "USD",
    bsr,
    review_count: reviewCount,
    average_rating: rating,
    category,
    brand,
    image_url,
  };
}
