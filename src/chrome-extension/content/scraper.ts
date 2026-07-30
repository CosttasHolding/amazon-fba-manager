export interface ScrapedProduct {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  category: string | null;
  image_url: string | null;
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/([A-Z0-9]{10})(?:\/|$|\?)/);
  return match?.[1] ?? null;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseBsr(text: string): number | null {
  const cleaned = text.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

export function scrapeCurrentPage(): ScrapedProduct[] {
  const results: ScrapedProduct[] = [];

  const productCards = document.querySelectorAll(
    '[data-asin]:not([data-asin=""])'
  );

  productCards.forEach((card) => {
    const asin = card.getAttribute("data-asin") || "";
    if (!asin || asin.length !== 10) return;

    const titleEl = card.querySelector("h2 a, h2 span, [class*='title']");
    const title = titleEl?.textContent?.trim() || "";

    const priceEl = card.querySelector(".a-price .a-offscreen, .a-price span:last-child");
    const price = priceEl?.textContent ? parsePrice(priceEl.textContent) : null;

    const ratingEl = card.querySelector("[class*='rating'] i span, .a-icon-alt");
    const ratingText = ratingEl?.textContent || "";
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const average_rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    const reviewCountEl = card.querySelector("[class*='rating'] ~ [class*='link'] a, [class*='rating'] ~ a");
    const reviewText = reviewCountEl?.textContent || "";
    const reviewCountMatch = reviewText.match(/([\d,]+)/);
    const review_count = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ""), 10) : null;

    const imgEl = card.querySelector("img[src*='images'], img[src*='media']");
    const image_url = imgEl?.getAttribute("src") || null;

    results.push({
      asin,
      title,
      price,
      currency: "USD",
      bsr: null,
      review_count,
      average_rating,
      category: null,
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
  const price = priceEl?.textContent ? parsePrice(priceEl.textContent) : null;

  const bsrEls = document.querySelectorAll("#detailBullets_feature_div li, #productDetails_detailBullets_sections1 tr");
  let bsr: number | null = null;
  bsrEls.forEach((el) => {
    const text = el.textContent || "";
    if (text.includes("Best Sellers Rank") || text.includes("Clasificación")) {
      bsr = parseBsr(text);
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

  const categoryEl = document.querySelector("#wayfinding-breadcrumbs_container ul li:last-child a");
  const category = categoryEl?.textContent?.trim() || null;

  return {
    asin: asinExtract,
    title,
    price,
    currency: "USD",
    bsr,
    review_count: reviewCount,
    average_rating: rating,
    category,
    image_url,
  };
}
