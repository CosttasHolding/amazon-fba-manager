# Task 8: URL Field in Product Creation Form

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
