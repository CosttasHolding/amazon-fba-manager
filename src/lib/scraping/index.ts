import puppeteer from "puppeteer";
import type { ScrapeResult } from "./types";
import { isAmazonUrl, scrapeAmazon, extractAsinFromUrl } from "./amazon";
import { isAlibabaUrl, scrapeAlibaba } from "./alibaba";

let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserInstance;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  if (!isValidUrl(url)) {
    return { ok: false, error: "URL no válida" };
  }

  if (isAmazonUrl(url)) {
    try {
      const browser = await getBrowser();
      const data = await scrapeAmazon(url, browser);
      return { ok: true, platform: "amazon", data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      return { ok: false, error: `Error al scrape Amazon: ${message}` };
    }
  }

  if (isAlibabaUrl(url)) {
    try {
      const browser = await getBrowser();
      const data = await scrapeAlibaba(url, browser);
      return { ok: true, platform: "alibaba", data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      return { ok: false, error: `Error al scrape Alibaba: ${message}` };
    }
  }

  return { ok: false, error: "Solo se admiten links de Amazon y Alibaba" };
}

export function detectPlatform(url: string): "amazon" | "alibaba" | "unknown" {
  if (isAmazonUrl(url)) return "amazon";
  if (isAlibabaUrl(url)) return "alibaba";
  return "unknown";
}

export function getAsinFromUrl(url: string): string | null {
  return extractAsinFromUrl(url);
}
