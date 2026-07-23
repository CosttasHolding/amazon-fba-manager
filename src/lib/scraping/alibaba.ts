import type { Browser } from "puppeteer";
import type { AlibabaSupplierData } from "./types";
import { ALIBABA_SELECTORS } from "./selectors";

export function isAlibabaUrl(url: string): boolean {
  return /alibaba\.(com|com\.\w{2}|cn|co\.uk)/i.test(url) ||
    /1688\.com/i.test(url);
}

export async function scrapeAlibaba(
  url: string,
  browser: Browser
): Promise<AlibabaSupplierData> {
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const data = await page.evaluate((selectors) => {
      const findText = (selectorList: readonly string[]): string | null => {
        for (const sel of selectorList) {
          const el = document.querySelector(sel);
          const text = el?.textContent?.trim();
          if (text && text.length > 0) return text;
        }
        return null;
      };

      const findAttr = (selectorList: readonly string[], attr: string): string | null => {
        for (const sel of selectorList) {
          const el = document.querySelector(sel);
          const val = el?.getAttribute(attr);
          if (val && val.length > 0) return val;
        }
        return null;
      };

      const productName = findText(selectors.title);

      let unitPrice: number | null = null;
      const priceText = findText(selectors.price);
      if (priceText) {
        const priceMatch = priceText.match(/[\d.,]+/);
        if (priceMatch) {
          const p = parseFloat(priceMatch[0].replace(",", ""));
          if (!isNaN(p)) unitPrice = p;
        }
      }

      let moq: number | null = null;
      const moqText = findText(selectors.moq);
      if (moqText) {
        const moqMatch = moqText.match(/(\d+)/);
        if (moqMatch) {
          const m = parseInt(moqMatch[1]);
          if (!isNaN(m)) moq = m;
        }
      }

      const companyName = findText(selectors.companyName);
      const country = findText(selectors.country);
      const imageUrl = findAttr(selectors.image, "src");
      const description = findText(selectors.description);

      return { productName, unitPrice, moq, companyName, country, imageUrl, description };
    }, ALIBABA_SELECTORS);

    return {
      platform: "alibaba",
      product_name: data.productName,
      supplier_name: data.companyName,
      country: data.country,
      moq: data.moq,
      unit_price: data.unitPrice,
      image_url: data.imageUrl,
      description: data.description,
    };
  } finally {
    await page.close();
  }
}
