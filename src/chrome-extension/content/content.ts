import { scrapeCurrentPage, scrapeProductPage } from "./scraper";
import { readOverlay, type OverlayProduct } from "./overlay-reader";
import { detectOverlays, collectOverlayDebugHtml } from "./sources";

let capturedData: Record<string, unknown> | null = null;
let lastOverlayKeys = "";

function isSearchResultsPage(): boolean {
  return !!document.querySelector('[data-asin]:not([data-asin=""])');
}

function isProductPage(): boolean {
  return !!document.querySelector("#productTitle");
}

function determinePageType(): "search" | "product" | "unknown" {
  if (isProductPage()) return "product";
  if (isSearchResultsPage()) return "search";
  return "unknown";
}

function mergeNonNull(
  base: Record<string, unknown>,
  extra: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (value != null && out[key] == null) out[key] = value;
  }
  return out;
}

function publishDebugToDom() {
  const root = document.documentElement;
  try {
    const debug = collectOverlayDebugHtml();
    root.setAttribute("data-fba-overlay-debug", JSON.stringify(debug));
    root.setAttribute("data-fba-captured", JSON.stringify(capturedData));
  } catch {
    root.setAttribute("data-fba-overlay-debug", "[]");
  }
}

function collect() {
  const pageType = determinePageType();
  if (pageType === "unknown") return;

  let products: Record<string, unknown>[];
  if (pageType === "product") {
    const single = scrapeProductPage();
    products = single ? [{ ...single }] : [];
  } else {
    products = scrapeCurrentPage().map((p) => ({ ...p }));
  }

  const overlays = detectOverlays();
  lastOverlayKeys = overlays.map((o) => o.key).sort().join(",");

  const byAsin = new Map<string, Record<string, unknown>>();
  for (const product of products) {
    if (product.asin) byAsin.set(String(product.asin), product);
  }

  const priority = ["h10", "amzscout", "keepa"];
  const sortedOverlays = [...overlays].sort(
    (a, b) => priority.indexOf(a.key) - priority.indexOf(b.key)
  );

  for (const overlay of sortedOverlays) {
    const overlayProducts = readOverlay(overlay.container) as OverlayProduct[];
    for (const op of overlayProducts) {
      const existing = byAsin.get(op.asin);
      if (existing) {
        byAsin.set(op.asin, mergeNonNull(existing, { ...op }));
      } else {
        byAsin.set(op.asin, { ...op });
      }
    }
  }

  const merged = Array.from(byAsin.values());
  if (merged.length > 0) {
    capturedData = {
      products: merged,
      mode: overlays.some((o) => o.key === "h10") ? "h10_xray" : "scraper",
      page_type: pageType,
      capture_url: window.location.href,
      capture_timestamp: new Date().toISOString(),
      sources: overlays.map((o) => o.key),
    };
  }

  publishDebugToDom();
}

function watchOverlays() {
  let timer: number | undefined;
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      const keys = detectOverlays().map((o) => o.key).sort().join(",");
      if (keys !== lastOverlayKeys) collect();
    }, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

collect();
watchOverlays();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CAPTURED_DATA") {
    sendResponse(capturedData);
  }
  if (message.type === "GET_OVERLAY_DEBUG") {
    sendResponse(collectOverlayDebugHtml());
  }
});
