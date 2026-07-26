# Task 3: Amazon Scraping Service — Report

## What was done

### 1. Added `getCatalogItem` to `src/lib/sp-api/endpoints.ts`
- Appended after `getReportDocument` (line 219+)
- Fixed brief's code: the brief passed query params as a second arg to `client.get()`, but `SpApiClient.get()` only accepts a `path: string`. Used `URLSearchParams` to build the query string and appended it to the path (matching the existing pattern in `getListings`, `getOrders`, etc.)
- Added proper inline type annotation for the API response shape instead of using `any`

### 2. Created `src/lib/scraping/amazon.ts`
- Three exported functions: `extractAsinFromUrl`, `isAmazonUrl`, `scrapeAmazon`
- Uses Puppeteer `Browser` to open a page, set user agent/viewport, navigate, and extract data via `page.evaluate`
- Extracts: title, price, weight (with kg/lb conversion), category, image (with fallback), description (feature bullets), dimensions
- Returns `AmazonProductData` conforming to the type from `types.ts`

## Type check

`npx tsc --noEmit` — zero new errors. All pre-existing errors are in test files (`route.test.ts`, `client.test.ts`) unrelated to this task.

## Commit

- `97a2094` — `feat: add Amazon scraping service and SP-API getCatalogItem`

## Concerns

- **Pre-existing test type errors**: `tsc --noEmit` shows ~30 errors in test files (`route.test.ts` for orders/products/sales/suppliers, `client.test.ts`). These are all `NextRequest` type mismatches and existed before this task. Not blocking.
- **Brief deviation**: Modified `getCatalogItem` to use `URLSearchParams` instead of the brief's `client.get(path, params)` call because the client only accepts one argument. This is the correct fix — no API behavior change.
