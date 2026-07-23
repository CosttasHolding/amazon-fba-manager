import type { Browser } from "puppeteer";
import type { AmazonProductData } from "./types";
import { AMAZON_SELECTORS } from "./selectors";

export function extractAsinFromUrl(url: string): string | null {
  const match = url.match(/\/(?:dp|gp\/product|product\/)\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

export function isAmazonUrl(url: string): boolean {
  return /amazon\.(com|com\.\w{2}|co\.\w{2}|de|fr|it|es|co\.uk|ca|com\.au|in|jp|mx|br)/i.test(url);
}

export async function scrapeAmazon(
  url: string,
  browser: Browser
): Promise<AmazonProductData> {
  const page = await browser.newPage();
  
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(AMAZON_SELECTORS.title, { timeout: 10000 }).catch(() => null);

    const data = await page.evaluate((selectors) => {
      const getText = (sel: string): string | null => {
        const el = document.querySelector(sel);
        return el?.textContent?.trim() ?? null;
      };

      const getAttr = (sel: string, attr: string): string | null => {
        const el = document.querySelector(sel);
        return el?.getAttribute(attr) ?? null;
      };

      const title = getText(selectors.title);

      const priceEl = document.querySelector(selectors.price);
      let price: number | null = null;
      if (priceEl?.textContent) {
        const priceMatch = priceEl.textContent.replace(/[^0-9.,]/g, "").replace(",", ".");
        const parsed = parseFloat(priceMatch);
        if (!isNaN(parsed)) price = parsed;
      }

      let weight: number | null = null;
      const weightTable = document.querySelector(selectors.weight.table);
      if (weightTable) {
        const rows = weightTable.querySelectorAll("tr");
        for (const row of rows) {
          const label = row.querySelector("th")?.textContent?.trim();
          if (label?.toLowerCase().includes(selectors.weight.label.toLowerCase())) {
            const value = row.querySelector("td")?.textContent?.trim();
            if (value) {
              const weightMatch = value.match(/([\d.,]+)/);
              if (weightMatch) {
                const w = parseFloat(weightMatch[1].replace(",", "."));
                if (!isNaN(w)) {
                  weight = value.toLowerCase().includes("kg") ? w : w * 0.453592;
                }
              }
            }
          }
        }
      }

      const categoryEl = document.querySelector(selectors.category);
      const category = categoryEl?.textContent?.trim() ?? null;

      const image = getAttr(selectors.image, "src") 
        ?? getAttr(selectors.imageFallback, "src");

      const bulletsEl = document.querySelector(selectors.bullets);
      let description: string | null = null;
      if (bulletsEl) {
        const items = bulletsEl.querySelectorAll("li span:not(.a-list-item)");
        const texts = Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
        if (texts.length > 0) description = texts.join("\n");
      }

      let dimensions: { length: number; width: number; height: number; unit: string } | null = null;
      const dimTable = document.querySelector(selectors.dimensions.table);
      if (dimTable) {
        const rows = dimTable.querySelectorAll("tr");
        for (const row of rows) {
          const label = row.querySelector("th")?.textContent?.trim();
          if (selectors.dimensions.labels.some(l => label?.toLowerCase().includes(l.toLowerCase()))) {
            const value = row.querySelector("td")?.textContent?.trim();
            if (value) {
              const parts = value.split("x").map((s) => parseFloat(s.trim().replace(/[^0-9.]/g, "")));
              if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
                dimensions = { length: parts[0], width: parts[1], height: parts[2], unit: "inches" };
              }
            }
          }
        }
      }

      return { title, price, weight, category, image, description, dimensions };
    }, AMAZON_SELECTORS);

    return {
      platform: "amazon",
      name: data.title,
      asin: extractAsinFromUrl(url),
      price: data.price,
      weight_kg: data.weight,
      category: data.category,
      image_url: data.image,
      description: data.description,
      dimensions: data.dimensions,
    };
  } finally {
    await page.close();
  }
}
