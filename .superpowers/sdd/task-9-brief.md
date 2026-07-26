# Task 9: URL Field in Product Form Modal

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
