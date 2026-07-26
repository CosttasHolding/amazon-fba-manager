# Task 2: Create CSS Selectors

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
