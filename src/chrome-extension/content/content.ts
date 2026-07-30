import { detectH10Xray, observeH10Overlay } from "../utils/detect-h10";
import { scrapeCurrentPage, scrapeProductPage } from "./scraper";
import { readH10Overlay } from "./h10-reader";

let capturedData: Record<string, unknown> | null = null;

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

function capture() {
  const pageType = determinePageType();
  if (pageType === "unknown") return;

  if (detectH10Xray()) {
    observeH10Overlay((container) => {
      const h10products = readH10Overlay(container);
      if (h10products.length > 0) {
        capturedData = {
          products: h10products,
          mode: "h10_xray",
          page_type: pageType,
          capture_url: window.location.href,
          capture_timestamp: new Date().toISOString(),
        };
      }
    });
  }

  let products;
  if (pageType === "product") {
    const single = scrapeProductPage();
    products = single ? [single] : [];
  } else {
    products = scrapeCurrentPage();
  }

  if (products.length > 0 && !capturedData) {
    capturedData = {
      products,
      mode: "scraper",
      page_type: pageType,
      capture_url: window.location.href,
      capture_timestamp: new Date().toISOString(),
    };
  }
}

capture();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CAPTURED_DATA") {
    sendResponse(capturedData);
  }
});
