# Task 7: useUrlScrape Hook

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
