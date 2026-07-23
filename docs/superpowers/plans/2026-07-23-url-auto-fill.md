# URL Auto-fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auto-fill functionality so pasting Amazon/Alibaba URLs in product/supplier forms automatically extracts and populates form fields.

**Architecture:** Hybrid approach — SP-API for Amazon (when connected) + Puppeteer fallback. Puppeteer direct for Alibaba. New `/api/scrape` endpoint + scraping service in `src/lib/scraping/`. UI: URL field in product/supplier forms + import dialog on dashboard.

**Tech Stack:** Puppeteer (scraping), Next.js Route Handler (API), react-hook-form + zod (forms), sonner (toasts), existing SP-API client.

## Global Constraints

- TypeScript strict: no `any`
- CSS variables: `bg-background`, never `bg-white`
- snake_case in DB/API, camelCase in frontend
- Zod for validation, sonner for toasts
- Spanish responses, English code
- `form-constants.ts` for shared form styles

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/scraping/types.ts` | Types for scraped data (AmazonData, SupplierData, ScrapeResult) |
| `src/lib/scraping/selectors.ts` | CSS selectors for Amazon and Alibaba (centralized, easy to update) |
| `src/lib/scraping/amazon.ts` | Amazon scraping logic + SP-API integration |
| `src/lib/scraping/alibaba.ts` | Alibaba scraping logic |
| `src/lib/scraping/index.ts` | Main `scrapeUrl()` function orchestrating detection + scraping |
| `src/app/api/scrape/route.ts` | POST endpoint exposing scrapeUrl to frontend |
| `src/hooks/use-url-scrape.ts` | Custom hook for URL scraping with debounce + loading state |
| `src/components/url-import-dialog.tsx` | Modal dialog for "Import from URL" feature |

### Modified Files

| File | Change |
|------|--------|
| `src/app/(dashboard)/products/new/page.tsx` | Add URL field + auto-fill logic |
| `src/components/product-form-modal.tsx` | Add URL field + auto-fill logic |
| `src/app/(dashboard)/suppliers/new/page.tsx` | Add scraping logic to alibaba_url field |
| `src/components/supplier-form-modal.tsx` | Add scraping logic to alibaba_url field |
| `src/app/(dashboard)/dashboard/page.tsx` | Add "Import from URL" button in PageHeader |
| `src/lib/sp-api/endpoints.ts` | Add `getCatalogItem()` function |
| `package.json` | Add `puppeteer` dependency |

---

## Task 1: Install Puppeteer + Create Scraping Types

**Files:**
- Modify: `package.json`
- Create: `src/lib/scraping/types.ts`

**Interfaces:**
- Produces: `AmazonProductData`, `AlibabaSupplierData`, `ScrapeResult` types used by all subsequent tasks

- [ ] **Step 1: Install Puppeteer**

Run: `npm install puppeteer`
Expected: Puppeteer installed, Chromium downloaded

- [ ] **Step 2: Create types file**

Create `src/lib/scraping/types.ts`:

```typescript
export interface AmazonProductData {
  platform: "amazon";
  name: string | null;
  asin: string | null;
  price: number | null;
  weight_kg: number | null;
  category: string | null;
  image_url: string | null;
  description: string | null;
  dimensions: {
    length: number | null;
    width: number | null;
    height: number | null;
    unit: string;
  } | null;
}

export interface AlibabaSupplierData {
  platform: "alibaba";
  supplier_name: string | null;
  country: string | null;
  moq: number | null;
  unit_price: number | null;
  image_url: string | null;
  description: string | null;
  product_name: string | null;
}

export type ScrapeData = AmazonProductData | AlibabaSupplierData;

export interface ScrapeSuccess {
  ok: true;
  platform: "amazon" | "alibaba";
  data: ScrapeData;
}

export interface ScrapeError {
  ok: false;
  error: string;
}

export type ScrapeResult = ScrapeSuccess | ScrapeError;

export type Platform = "amazon" | "alibaba" | "unknown";
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/scraping/types.ts
git commit -m "feat: install puppeteer and add scraping types"
```

---

## Task 2: Create CSS Selectors

**Files:**
- Create: `src/lib/scraping/selectors.ts`

**Interfaces:**
- Consumes: none
- Produces: `AMAZON_SELECTORS`, `ALIBABA_SELECTORS` objects used by amazon.ts and alibaba.ts

- [ ] **Step 1: Create selectors file**

Create `src/lib/scraping/selectors.ts`:

```typescript
export const AMAZON_SELECTORS = {
  title: "#productTitle",
  price: ".a-price .a-offscreen",
  weight: {
    table: "#productDetails_techSpec_section_1",
    label: "Weight",
  },
  category: "#wayfinding-breadcrumbs_container li:last-child a",
  image: "#landingImage",
  imageFallback: "#imgBlkFront",
  bullets: "#feature-bullets",
  dimensions: {
    table: "#productDetails_techSpec_section_1",
    labels: ["Package Dimensions", "Product Dimensions"],
  },
} as const;

export const ALIBABA_SELECTORS = {
  title: [
    ".title-text",
    ".product-title",
    "h1.title",
    "[class*='product-title']",
  ],
  price: [
    ".price-text",
    ".m-gallery-offer-price",
    "[class*='price'] span",
    ".price .value",
  ],
  moq: [
    ".quantity",
    ".min-order",
    "[class*='min-order']",
    "[class*='quantity']",
  ],
  companyName: [
    ".company-name",
    ".supplier-name",
    "[class*='company-name']",
    "[class*='supplier-name']",
  ],
  country: [
    ".supplier-country",
    "[class*='country']",
    "[class*='location']",
  ],
  image: [
    ".main-image img",
    ".detail-gallery img",
    "[class*='gallery'] img",
  ],
  description: [
    ".product-desc",
    ".detail-desc",
    "[class*='product-description']",
    "[class*='detail-desc']",
  ],
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scraping/selectors.ts
git commit -m "feat: add centralized CSS selectors for Amazon and Alibaba scraping"
```

---

## Task 3: Amazon Scraping Service

**Files:**
- Create: `src/lib/scraping/amazon.ts`
- Modify: `src/lib/sp-api/endpoints.ts` (add getCatalogItem)

**Interfaces:**
- Consumes: `AmazonProductData` from types.ts, `AMAZON_SELECTORS` from selectors.ts
- Produces: `scrapeAmazon(url: string, browser: Browser)` function, `getCatalogItem(client, asin)` function

- [ ] **Step 1: Add getCatalogItem to SP-API endpoints**

Read `src/lib/sp-api/endpoints.ts` to find the last function, then append:

```typescript
export async function getCatalogItem(
  client: SpApiClient,
  asin: string,
  marketplaceId: string = "ATVPDKIKX0DER"
): Promise<{
  title: string | null;
  brand: string | null;
  category: string | null;
  weight: number | null;
  dimensions: { length: number; width: number; height: number; unit: string } | null;
  image_url: string | null;
  description: string | null;
} | null> {
  try {
    const data = await client.get(
      `/catalog/2022-04-01/items/${asin}`,
      {
        marketplaceIds: marketplaceId,
        includedData: "summaries,attributes,images,productTypes",
      }
    );

    const item = data?.responses?.[0]?.summaries?.[0];
    if (!item) return null;

    const images = data?.responses?.[0]?.images?.[0]?.images;
    const imageUrl = images?.[0]?.link ?? null;

    const attributes = data?.responses?.[0]?.attributes;
    let weight: number | null = null;
    let dimensions: { length: number; width: number; height: number; unit: string } | null = null;

    if (attributes) {
      const weightAttr = attributes.find((a: { attribute_name: string }) => 
        a.attribute_name === "item_weight" || a.attribute_name === "weight"
      );
      if (weightAttr?.value?.[0]) {
        const w = parseFloat(weightAttr.value[0]);
        if (!isNaN(w)) weight = w;
      }

      const dimAttr = attributes.find((a: { attribute_name: string }) => 
        a.attribute_name === "item_dimensions" || a.attribute_name === "product_dimensions"
      );
      if (dimAttr?.value?.[0]) {
        const parts = dimAttr.value[0].split("x").map((s: string) => parseFloat(s.trim()));
        if (parts.length === 3 && parts.every((n: number) => !isNaN(n))) {
          dimensions = { length: parts[0], width: parts[1], height: parts[2], unit: "inches" };
        }
      }
    }

    return {
      title: item.title ?? null,
      brand: item.brand ?? null,
      category: item.productType ?? null,
      weight,
      dimensions,
      image_url: imageUrl,
      description: null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create Amazon scraping service**

Create `src/lib/scraping/amazon.ts`:

```typescript
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
              const parts = value.split("x").map((s: string) => parseFloat(s.trim().replace(/[^0-9.]/g, "")));
              if (parts.length === 3 && parts.every((n: number) => !isNaN(n))) {
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/scraping/amazon.ts src/lib/sp-api/endpoints.ts
git commit -m "feat: add Amazon scraping service and SP-API getCatalogItem"
```

---

## Task 4: Alibaba Scraping Service

**Files:**
- Create: `src/lib/scraping/alibaba.ts`

**Interfaces:**
- Consumes: `AlibabaSupplierData` from types.ts, `ALIBABA_SELECTORS` from selectors.ts
- Produces: `scrapeAlibaba(url: string, browser: Browser)` function

- [ ] **Step 1: Create Alibaba scraping service**

Create `src/lib/scraping/alibaba.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scraping/alibaba.ts
git commit -m "feat: add Alibaba scraping service"
```

---

## Task 5: Main ScrapeUrl Orchestrator

**Files:**
- Create: `src/lib/scraping/index.ts`

**Interfaces:**
- Consumes: `scrapeAmazon`, `isAmazonUrl`, `extractAsinFromUrl` from amazon.ts; `scrapeAlibaba`, `isAlibabaUrl` from alibaba.ts; `ScrapeResult` from types.ts
- Produces: `scrapeUrl(url: string): Promise<ScrapeResult>` — the main function used by the API route

- [ ] **Step 1: Create orchestrator**

Create `src/lib/scraping/index.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scraping/index.ts
git commit -m "feat: add main scrapeUrl orchestrator with platform detection"
```

---

## Task 6: Scrape API Route

**Files:**
- Create: `src/app/api/scrape/route.ts`

**Interfaces:**
- Consumes: `scrapeUrl` from `@/lib/scraping`
- Produces: `POST /api/scrape` endpoint returning `{ ok, platform, data }` or `{ ok: false, error }`

- [ ] **Step 1: Create API route**

Create `src/app/api/scrape/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraping";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, error: "URL es requerida" },
        { status: 400 }
      );
    }

    const result = await scrapeUrl(url);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      platform: result.platform,
      data: result.data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/scrape/route.ts
git commit -m "feat: add POST /api/scrape endpoint"
```

---

## Task 7: useUrlScrape Hook

**Files:**
- Create: `src/hooks/use-url-scrape.ts`

**Interfaces:**
- Consumes: `/api/scrape` endpoint, `useDebounce` from `@/hooks/use-debounce`
- Produces: `useUrlScrape()` hook returning `{ debouncedUrl, isScraping, scrapedData, error, platform }`

- [ ] **Step 1: Create the hook**

Create `src/hooks/use-url-scrape.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "./use-debounce";
import type { ScrapeData } from "@/lib/scraping/types";

interface UseUrlScrapeReturn {
  url: string;
  setUrl: (url: string) => void;
  debouncedUrl: string;
  isScraping: boolean;
  scrapedData: ScrapeData | null;
  platform: "amazon" | "alibaba" | "unknown";
  error: string | null;
  reset: () => void;
}

export function useUrlScrape(debounceMs = 500): UseUrlScrapeReturn {
  const [url, setUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"amazon" | "alibaba" | "unknown">("unknown");

  const debouncedUrl = useDebounce(url, debounceMs);

  const detectPlatform = useCallback((urlStr: string): "amazon" | "alibaba" | "unknown" => {
    if (/amazon\.(com|co\.\w{2}|de|fr|it|es|co\.uk|ca|com\.au|in|jp|mx|br)/i.test(urlStr)) {
      return "amazon";
    }
    if (/alibaba\.(com|cn)|1688\.com/i.test(urlStr)) {
      return "alibaba";
    }
    return "unknown";
  }, []);

  useEffect(() => {
    if (!debouncedUrl || debouncedUrl.length < 10) {
      setScrapedData(null);
      setError(null);
      setPlatform("unknown");
      return;
    }

    const detected = detectPlatform(debouncedUrl);
    setPlatform(detected);

    if (detected === "unknown") {
      setScrapedData(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function scrape() {
      setIsScraping(true);
      setError(null);

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: debouncedUrl }),
        });

        const data = await res.json();

        if (cancelled) return;

        if (data.ok) {
          setScrapedData(data.data);
          setError(null);
        } else {
          setScrapedData(null);
          setError(data.error || "Error al extraer datos");
        }
      } catch {
        if (cancelled) return;
        setScrapedData(null);
        setError("Error de conexión");
      } finally {
        if (!cancelled) setIsScraping(false);
      }
    }

    scrape();

    return () => { cancelled = true; };
  }, [debouncedUrl, detectPlatform]);

  const reset = useCallback(() => {
    setUrl("");
    setScrapedData(null);
    setError(null);
    setPlatform("unknown");
    setIsScraping(false);
  }, []);

  return { url, setUrl, debouncedUrl, isScraping, scrapedData, platform, error, reset };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-url-scrape.ts
git commit -m "feat: add useUrlScrape hook with debounce and auto-detection"
```

---

## Task 8: URL Field in Product Creation Form

**Files:**
- Modify: `src/app/(dashboard)/products/new/page.tsx`

**Interfaces:**
- Consumes: `useUrlScrape` hook, `AmazonProductData` from types
- Produces: URL field at top of form, auto-fills name, asin, salePrice, weightKg, category

- [ ] **Step 1: Read the current file to understand exact structure**

Read `src/app/(dashboard)/products/new/page.tsx` fully.

- [ ] **Step 2: Add imports and URL field**

At the top of the file, add imports:

```typescript
import { useUrlScrape } from "@/hooks/use-url-scrape";
import { Link2, Loader2, CheckCircle2 } from "lucide-react";
```

Inside the component (after `useForm` setup), add the hook:

```typescript
const urlScrape = useUrlScrape();
```

Add `watch` for the URL field:

```typescript
const watchedUrl = urlScrape.url;
```

- [ ] **Step 3: Add useEffect to auto-fill from scraped data**

After the existing `useEffect` blocks, add:

```typescript
useEffect(() => {
  if (urlScrape.scrapedData && urlScrape.platform === "amazon") {
    const data = urlScrape.scrapedData;
    if (data.platform === "amazon") {
      if (data.name) setValue("name", data.name);
      if (data.asin) setValue("asin", data.asin);
      if (data.price && data.price > 0) setValue("salePrice", data.price);
      if (data.weight_kg && data.weight_kg > 0) setValue("weightKg", data.weight_kg);
      if (data.category) {
        const catMap: Record<string, string> = {
          "electronics": "Electronics",
          "toys": "Toys",
          "home": "Home",
          "kitchen": "Kitchen",
          "health": "Health",
          "beauty": "Beauty",
          "sports": "Sports",
          "books": "Books",
        };
        const mapped = catMap[data.category.toLowerCase()] ?? data.category;
        if (["Electronics","Toys","Home","Kitchen","Health","Beauty","Sports","Books","Other"].includes(mapped)) {
          setValue("category", mapped as "Electronics" | "Toys" | "Home" | "Kitchen" | "Health" | "Beauty" | "Sports" | "Books" | "Other");
        }
      }
    }
  }
}, [urlScrape.scrapedData, urlScrape.platform, setValue]);
```

- [ ] **Step 4: Add URL field JSX**

In the form JSX, right after the `<form>` tag and before the first section, add:

```tsx
{/* URL Auto-detect */}
<div className="mb-6 p-4 rounded-lg border border-dashed border-border bg-muted/30">
  <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 block flex items-center gap-1.5">
    <Link2 className="w-3.5 h-3.5" />
    URL del producto (Amazon)
  </label>
  <div className="relative">
    <Input
      placeholder="https://amazon.com/dp/B08N5WRWNW..."
      value={urlScrape.url}
      onChange={(e) => urlScrape.setUrl(e.target.value)}
      className="h-9 bg-background border-border text-sm pr-20"
    />
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
      {urlScrape.isScraping && (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      )}
      {!urlScrape.isScraping && urlScrape.platform === "amazon" && urlScrape.scrapedData && (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      )}
      {!urlScrape.isScraping && urlScrape.platform === "unknown" && urlScrape.url.length > 10 && (
        <span className="text-xs text-muted-foreground">No detectado</span>
      )}
    </div>
  </div>
  {urlScrape.isScraping && (
    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
      <Loader2 className="w-3 h-3 animate-spin" />
      Extrayendo datos del producto...
    </p>
  )}
  {urlScrape.error && (
    <p className="text-xs text-destructive mt-1.5">
      {urlScrape.error}. Completá manualmente.
    </p>
  )}
  {!urlScrape.isScraping && !urlScrape.error && urlScrape.scrapedData && urlScrape.platform === "amazon" && (
    <p className="text-xs text-green-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Datos extraídos correctamente
    </p>
  )}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/products/new/page.tsx
git commit -m "feat: add URL auto-detect field to product creation form"
```

---

## Task 9: URL Field in Product Form Modal

**Files:**
- Modify: `src/components/product-form-modal.tsx`

**Interfaces:**
- Consumes: `useUrlScrape` hook, same auto-fill logic as Task 8
- Produces: URL field in the modal form with auto-complete

- [ ] **Step 1: Read the current file**

Read `src/components/product-form-modal.tsx` fully.

- [ ] **Step 2: Add imports and URL field**

Add imports:

```typescript
import { useUrlScrape } from "@/hooks/use-url-scrape";
import { Link2, Loader2, CheckCircle2 } from "lucide-react";
```

Inside the component, add the hook:

```typescript
const urlScrape = useUrlScrape();
```

Add useEffect for auto-fill (same as Task 8):

```typescript
useEffect(() => {
  if (urlScrape.scrapedData && urlScrape.platform === "amazon") {
    const data = urlScrape.scrapedData;
    if (data.platform === "amazon") {
      if (data.name) setValue("name", data.name);
      if (data.asin) setValue("asin", data.asin);
      if (data.price && data.price > 0) setValue("salePrice", data.price);
      if (data.weight_kg && data.weight_kg > 0) setValue("weightKg", data.weight_kg);
      if (data.category) {
        const catMap: Record<string, string> = {
          "electronics": "Electronics",
          "toys": "Toys",
          "home": "Home",
          "kitchen": "Kitchen",
          "health": "Health",
          "beauty": "Beauty",
          "sports": "Sports",
          "books": "Books",
        };
        const mapped = catMap[data.category.toLowerCase()] ?? data.category;
        if (["Electronics","Toys","Home","Kitchen","Health","Beauty","Sports","Books","Other"].includes(mapped)) {
          setValue("category", mapped as "Electronics" | "Toys" | "Home" | "Kitchen" | "Health" | "Beauty" | "Sports" | "Books" | "Other");
        }
      }
    }
  }
}, [urlScrape.scrapedData, urlScrape.platform, setValue]);
```

- [ ] **Step 3: Add URL field JSX in the modal**

In the modal form, right after `<DialogContent>` and before the first section, add:

```tsx
<div className="mb-4 p-3 rounded-lg border border-dashed border-border bg-muted/30">
  <label className={sectionLabel}>
    <Link2 className="w-3.5 h-3.5" />
    URL del producto (Amazon)
  </label>
  <div className="relative">
    <Input
      placeholder="https://amazon.com/dp/B08N5WRWNW..."
      value={urlScrape.url}
      onChange={(e) => urlScrape.setUrl(e.target.value)}
      className={inputClass + " pr-20"}
    />
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
      {urlScrape.isScraping && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      {!urlScrape.isScraping && urlScrape.platform === "amazon" && urlScrape.scrapedData && (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      )}
    </div>
  </div>
  {urlScrape.isScraping && (
    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <Loader2 className="w-3 h-3 animate-spin" />
      Extrayendo datos...
    </p>
  )}
  {urlScrape.error && (
    <p className="text-xs text-destructive mt-1">{urlScrape.error}</p>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/product-form-modal.tsx
git commit -m "feat: add URL auto-detect field to product form modal"
```

---

## Task 10: Scraping in Supplier Creation Form

**Files:**
- Modify: `src/app/(dashboard)/suppliers/new/page.tsx`

**Interfaces:**
- Consumes: `useUrlScrape` hook, `AlibabaSupplierData` from types
- Produces: Auto-fills name, country, min_order_qty when Alibaba URL is pasted

- [ ] **Step 1: Read the current file**

Read `src/app/(dashboard)/suppliers/new/page.tsx` fully.

- [ ] **Step 2: Add imports and hook**

Add imports:

```typescript
import { useUrlScrape } from "@/hooks/use-url-scrape";
import { Loader2, CheckCircle2 } from "lucide-react";
```

Inside the component, add the hook:

```typescript
const urlScrape = useUrlScrape();
```

- [ ] **Step 3: Add useEffect for Alibaba auto-fill**

```typescript
useEffect(() => {
  if (urlScrape.scrapedData && urlScrape.platform === "alibaba") {
    const data = urlScrape.scrapedData;
    if (data.platform === "alibaba") {
      if (data.supplier_name) setValue("name", data.supplier_name);
      if (data.country) setValue("country", data.country);
      if (data.moq && data.moq > 0) setValue("min_order_qty", data.moq);
    }
  }
}, [urlScrape.scrapedData, urlScrape.platform, setValue]);
```

- [ ] **Step 4: Update the alibaba_url field**

The existing `alibaba_url` Input field — update its `onChange` to also feed the URL to `urlScrape`:

```tsx
<Input
  placeholder="https://alibaba.com/product/..."
  {...register("alibaba_url")}
  onChange={(e) => {
    register("alibaba_url").onChange(e);
    urlScrape.setUrl(e.target.value);
  }}
  className={inputClass}
/>
```

- [ ] **Step 5: Add status indicators below the alibaba_url field**

After the alibaba_url Input, add:

```tsx
{urlScrape.isScraping && (
  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
    <Loader2 className="w-3 h-3 animate-spin" />
    Extrayendo datos del proveedor...
  </p>
)}
{urlScrape.error && (
  <p className="text-xs text-destructive mt-1">{urlScrape.error}</p>
)}
{!urlScrape.isScraping && !urlScrape.error && urlScrape.scrapedData && urlScrape.platform === "alibaba" && (
  <p className="text-xs text-green-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
    <CheckCircle2 className="w-3 h-3" />
    Datos del proveedor extraídos
  </p>
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/suppliers/new/page.tsx
git commit -m "feat: add Alibaba URL auto-detect to supplier creation form"
```

---

## Task 11: Scraping in Supplier Form Modal

**Files:**
- Modify: `src/components/supplier-form-modal.tsx`

**Interfaces:**
- Consumes: `useUrlScrape` hook, same Alibaba auto-fill as Task 10
- Produces: Auto-fills supplier fields when Alibaba URL is pasted in modal

- [ ] **Step 1: Read the current file**

Read `src/components/supplier-form-modal.tsx` fully.

- [ ] **Step 2: Add imports and hook**

Add imports:

```typescript
import { useUrlScrape } from "@/hooks/use-url-scrape";
import { Loader2, CheckCircle2 } from "lucide-react";
```

Inside the component, add:

```typescript
const urlScrape = useUrlScrape();
```

- [ ] **Step 3: Add useEffect for Alibaba auto-fill**

```typescript
useEffect(() => {
  if (urlScrape.scrapedData && urlScrape.platform === "alibaba") {
    const data = urlScrape.scrapedData;
    if (data.platform === "alibaba") {
      if (data.supplier_name) setValue("name", data.supplier_name);
      if (data.country) setValue("country", data.country);
      if (data.moq && data.moq > 0) setValue("min_order_qty", data.moq);
    }
  }
}, [urlScrape.scrapedData, urlScrape.platform, setValue]);
```

- [ ] **Step 4: Update the alibaba_url field**

Update the `onChange` of the `alibaba_url` Input to also feed `urlScrape`:

```tsx
<Input
  placeholder="https://alibaba.com/product/..."
  {...register("alibaba_url")}
  onChange={(e) => {
    register("alibaba_url").onChange(e);
    urlScrape.setUrl(e.target.value);
  }}
  className={inputClass}
/>
```

- [ ] **Step 5: Add status indicators below the field**

Same pattern as Task 10, Step 5.

- [ ] **Step 6: Commit**

```bash
git add src/components/supplier-form-modal.tsx
git commit -m "feat: add Alibaba URL auto-detect to supplier form modal"
```

---

## Task 12: URL Import Dialog Component

**Files:**
- Create: `src/components/url-import-dialog.tsx`

**Interfaces:**
- Consumes: `useUrlScrape` hook, Next.js `useRouter`
- Produces: `UrlImportDialog` component with trigger button

- [ ] **Step 1: Create the dialog component**

Create `src/components/url-import-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Loader2, CheckCircle2, Package, Factory } from "lucide-react";
import { useUrlScrape } from "@/hooks/use-url-scrape";
import { inputClass } from "@/lib/form-constants";

interface UrlImportDialogProps {
  children: React.ReactNode;
}

export function UrlImportDialog({ children }: UrlImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<"product" | "supplier">("product");
  const router = useRouter();
  const urlScrape = useUrlScrape();

  function handleImport() {
    if (!urlScrape.scrapedData) return;

    if (importType === "product") {
      const params = new URLSearchParams();
      if (urlScrape.platform === "amazon") {
        const data = urlScrape.scrapedData;
        if (data.platform === "amazon") {
          if (data.name) params.set("name", data.name);
          if (data.asin) params.set("asin", data.asin);
          if (data.price) params.set("salePrice", String(data.price));
          if (data.weight_kg) params.set("weightKg", String(data.weight_kg));
          if (data.category) params.set("category", data.category);
        }
      }
      router.push(`/products/new?${params.toString()}`);
    } else {
      const params = new URLSearchParams();
      if (urlScrape.platform === "alibaba") {
        const data = urlScrape.scrapedData;
        if (data.platform === "alibaba") {
          if (data.supplier_name) params.set("name", data.supplier_name);
          if (data.country) params.set("country", data.country);
          if (data.moq) params.set("min_order_qty", String(data.moq));
          if (urlScrape.url) params.set("alibaba_url", urlScrape.url);
        }
      }
      router.push(`/suppliers/new?${params.toString()}`);
    }

    setOpen(false);
    urlScrape.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) urlScrape.reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Importar desde URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Pegá el link de Amazon o Alibaba
            </Label>
            <div className="relative">
              <Input
                placeholder="https://amazon.com/dp/... o https://alibaba.com/..."
                value={urlScrape.url}
                onChange={(e) => urlScrape.setUrl(e.target.value)}
                className={inputClass + " pr-20"}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {urlScrape.isScraping && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {!urlScrape.isScraping && urlScrape.scrapedData && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            {urlScrape.isScraping && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Extrayendo datos...
              </p>
            )}
            {urlScrape.error && (
              <p className="text-xs text-destructive mt-1">{urlScrape.error}</p>
            )}
            {!urlScrape.isScraping && !urlScrape.error && urlScrape.scrapedData && (
              <p className="text-xs text-green-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Datos extraídos correctamente
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              ¿Qué querés importar?
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={importType === "product" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setImportType("product")}
              >
                <Package className="w-4 h-4 mr-1.5" />
                Producto
              </Button>
              <Button
                type="button"
                variant={importType === "supplier" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setImportType("supplier")}
              >
                <Factory className="w-4 h-4 mr-1.5" />
                Proveedor
              </Button>
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={!urlScrape.scrapedData || urlScrape.isScraping}
            className="w-full"
          >
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/url-import-dialog.tsx
git commit -m "feat: add UrlImportDialog component for dashboard import"
```

---

## Task 13: Add Import Button to Dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `UrlImportDialog` component
- Produces: Import button in PageHeader next to ExportButton

- [ ] **Step 1: Add import**

At the top of the file, add:

```typescript
import { UrlImportDialog } from "@/components/url-import-dialog";
import { Upload } from "lucide-react";
```

- [ ] **Step 2: Add button in PageHeader**

In the `<PageHeader>` section, add the import dialog before `<ExportButton>`:

```tsx
<PageHeader
  badge={t("dashboard.badge", locale)}
  title={t("dashboard.title", locale)}
  subtitle={t("dashboard.subtitle", locale)}
  breadcrumbs={[{ label: t("nav.dashboard", locale) }]}
>
  <UrlImportDialog>
    <Button variant="outline" size="sm">
      <Upload className="w-4 h-4 mr-1.5" />
      Importar URL
    </Button>
  </UrlImportDialog>
  <ExportButton onClick={handleExport} />
</PageHeader>
```

Note: Add `Button` import from `@/components/ui/button` if not already imported.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: add Import from URL button to dashboard header"
```

---

## Task 14: Read URL Params in Product/Supplier Forms

**Files:**
- Modify: `src/app/(dashboard)/products/new/page.tsx`
- Modify: `src/app/(dashboard)/suppliers/new/page.tsx`

**Interfaces:**
- Consumes: `useSearchParams` from next/navigation
- Produces: Forms pre-populated when navigated from Import Dialog with query params

- [ ] **Step 1: Add search params to product form**

In `src/app/(dashboard)/products/new/page.tsx`, add:

```typescript
import { useSearchParams } from "next/navigation";
```

Inside the component, after other hooks:

```typescript
const searchParams = useSearchParams();
```

Add useEffect to populate from search params:

```typescript
useEffect(() => {
  const name = searchParams.get("name");
  const asin = searchParams.get("asin");
  const salePrice = searchParams.get("salePrice");
  const weightKg = searchParams.get("weightKg");
  const category = searchParams.get("category");

  if (name) setValue("name", name);
  if (asin) setValue("asin", asin);
  if (salePrice) setValue("salePrice", parseFloat(salePrice));
  if (weightKg) setValue("weightKg", parseFloat(weightKg));
  if (category) {
    const valid = ["Electronics","Toys","Home","Kitchen","Health","Beauty","Sports","Books","Other"];
    if (valid.includes(category)) {
      setValue("category", category as "Electronics" | "Toys" | "Home" | "Kitchen" | "Health" | "Beauty" | "Sports" | "Books" | "Other");
    }
  }
}, [searchParams, setValue]);
```

- [ ] **Step 2: Add search params to supplier form**

In `src/app/(dashboard)/suppliers/new/page.tsx`, add:

```typescript
import { useSearchParams } from "next/navigation";
```

Inside the component:

```typescript
const searchParams = useSearchParams();
```

Add useEffect:

```typescript
useEffect(() => {
  const name = searchParams.get("name");
  const country = searchParams.get("country");
  const moq = searchParams.get("min_order_qty");
  const alibabaUrl = searchParams.get("alibaba_url");

  if (name) setValue("name", name);
  if (country) setValue("country", country);
  if (moq) setValue("min_order_qty", parseInt(moq));
  if (alibabaUrl) {
    setValue("alibaba_url", alibabaUrl);
    urlScrape.setUrl(alibabaUrl);
  }
}, [searchParams, setValue, urlScrape]);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/products/new/page.tsx src/app/\(dashboard\)/suppliers/new/page.tsx
git commit -m "feat: read URL search params to pre-populate product/supplier forms"
```

---

## Task 15: Type Check + Lint + Final Verification

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Confirmed working build

- [ ] **Step 1: Run type check**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors or warnings

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve type/lint issues from URL auto-fill feature"
```
