import { scrapeCurrentPage, scrapeProductPage } from "./scraper";
import { readOverlay, readH10Summary, readAMZScout, type OverlayProduct } from "./overlay-reader";
import { detectOverlays, collectOverlayDebugHtml, overlayContentFingerprint } from "./sources";

let capturedData: Record<string, unknown> | null = null;
let lastOverlayKeys = "";
let lastOverlayFingerprint = "";

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
  lastOverlayFingerprint = overlayContentFingerprint();

  const byAsin = new Map<string, Record<string, unknown>>();
  for (const product of products) {
    if (product.asin) byAsin.set(String(product.asin), product);
  }

  const priority = ["h10", "amzscout", "keepa"];
  const sortedOverlays = [...overlays].sort(
    (a, b) => priority.indexOf(a.key) - priority.indexOf(b.key)
  );

  const overlaysWithData: string[] = [];
  const fallbackAsin = products.length === 1 ? String(products[0].asin ?? "") : null;
  for (const overlay of sortedOverlays) {
    const overlayProducts =
      overlay.key === "h10"
        ? (readH10Summary(overlay.container) as OverlayProduct[])
        : overlay.key === "amzscout"
          ? (readAMZScout(overlay.container, fallbackAsin) as OverlayProduct[])
          : (readOverlay(overlay.container) as OverlayProduct[]);
    if (overlayProducts.length > 0) overlaysWithData.push(overlay.key);
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
      mode: overlaysWithData.includes("h10") ? "h10_xray" : "scraper",
      page_type: pageType,
      capture_url: window.location.href,
      capture_timestamp: new Date().toISOString(),
      sources: overlaysWithData,
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
      const fingerprint = overlayContentFingerprint();
      if (keys !== lastOverlayKeys || fingerprint !== lastOverlayFingerprint) collect();
    }, 400);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
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
