import { sendToWebApp } from "../utils/api";

interface ProductData {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  review_count: number | null;
  average_rating: number | null;
  estimated_monthly_sales?: number | null;
  [key: string]: unknown;
}

interface CapturedResponse {
  products: ProductData[];
  mode: string;
  page_type: string;
  capture_url: string;
  capture_timestamp: string;
}

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

async function init() {
  const loading = $("loading");
  const noData = $("no-data");
  const results = $("results");
  const sent = $("sent");

  loading.classList.remove("hidden");

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab.id || !activeTab.url?.includes("amazon")) {
      loading.classList.add("hidden");
      noData.classList.remove("hidden");
      return;
    }

    const response = await chrome.tabs.sendMessage(activeTab.id, { type: "GET_CAPTURED_DATA" }) as CapturedResponse | null;

    loading.classList.add("hidden");

    if (!response || !response.products || response.products.length === 0) {
      noData.classList.remove("hidden");
      return;
    }

    results.classList.remove("hidden");

    const modeBadge = $("mode-badge");
    modeBadge.textContent = response.mode === "h10_xray" ? "H10 Xray" : "Scraper";
    modeBadge.className = `badge ${response.mode === "h10_xray" ? "h10" : "scraper"}`;

    $("product-count").textContent = `${response.products.length} producto(s)`;
    $("page-type").textContent = response.page_type;

    const list = $("product-list");
    response.products.forEach((p) => {
      const card = document.createElement("div");
      card.className = "product-card";

      const meta: string[] = [
        `<span><span class="label">ASIN:</span> <span class="value">${escapeHtml(p.asin)}</span></span>`,
      ];
      if (p.price) meta.push(`<span><span class="label">Precio:</span> <span class="value">$${p.price}</span></span>`);
      if (p.bsr) meta.push(`<span><span class="label">BSR:</span> <span class="value">#${p.bsr}</span></span>`);
      if (p.review_count) meta.push(`<span><span class="label">Reviews:</span> <span class="value">${p.review_count}</span></span>`);
      if (p.average_rating) meta.push(`<span><span class="label">Rating:</span> <span class="value">${p.average_rating}</span></span>`);
      if (p.estimated_monthly_sales) meta.push(`<span><span class="label">Ventas/m:</span> <span class="value">${Number(p.estimated_monthly_sales).toLocaleString()}</span></span>`);

      card.innerHTML = `<div class="product-title">${escapeHtml(p.title || "Unknown")}</div><div class="product-meta">${meta.join("")}</div>`;
      list.appendChild(card);
    });

    $("send-btn").addEventListener("click", async () => {
      const result = await sendToWebApp({
        products: response.products,
        mode: response.mode,
        page_type: response.page_type,
        search_keyword: getSearchKeyword(response.capture_url),
      });

      results.classList.add("hidden");
      sent.classList.remove("hidden");

      $("sent-count").textContent = result.ok
        ? `${response.products.length} producto(s) enviado(s) correctamente`
        : `Error: ${result.error || "Error al enviar"}`;
    });

    $("done-btn").addEventListener("click", () => {
      window.close();
    });
  } catch {
    loading.classList.add("hidden");
    noData.classList.remove("hidden");
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getSearchKeyword(url: string): string {
  try {
    const params = new URL(url).searchParams;
    return params.get("k") || params.get("keywords") || "";
  } catch {
    return "";
  }
}

document.addEventListener("DOMContentLoaded", init);
