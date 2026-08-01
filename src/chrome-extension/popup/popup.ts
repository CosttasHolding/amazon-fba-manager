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
  sources?: string[];
}

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

async function init() {
  const loading = $("loading");
  const noData = $("no-data");
  const results = $("results");
  const sent = $("sent");

  let activeTabId: number | undefined;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    activeTabId = activeTab?.id;
  } catch {
    // sin tabs accesibles, el debug tambien puede fallar
  }

  const showDebug = async () => {
    let debug: { key: string; html: string }[] | null = null;
    if (activeTabId) {
      try {
        debug = await chrome.tabs.sendMessage(activeTabId, { type: "GET_OVERLAY_DEBUG" }) as { key: string; html: string }[] | null;
      } catch {
        debug = null;
      }
    }
    if (!debug || debug.length === 0) {
      $("debug-output").value = "No se detectaron overlays (H10, AMZScout o Keepa) en esta página.\n\nSi instalaste las extensiones, recargá la página de Amazon y abrí el overlay antes de volver a hacer debug.";
    } else {
      $("debug-output").value = debug
        .map((o) => `<!-- ===== ${o.key.toUpperCase()} ===== -->\n${o.html}`)
        .join("\n\n");
    }
    results.classList.add("hidden");
    noData.classList.add("hidden");
    $("debug").classList.remove("hidden");
  };

  $("debug-btn").addEventListener("click", showDebug);

  $("copy-btn").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("debug-output").value);
  });

  $("debug-back-btn").addEventListener("click", () => {
    $("debug").classList.add("hidden");
    if ($("product-count").textContent) {
      results.classList.remove("hidden");
    } else {
      noData.classList.remove("hidden");
    }
  });

  loading.classList.remove("hidden");

  try {
    if (!activeTabId) {
      loading.classList.add("hidden");
      noData.classList.remove("hidden");
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab.url?.includes("amazon")) {
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
    $("source-badge").textContent =
      response.sources && response.sources.length > 0
        ? `Fuentes: ${response.sources.join(", ")}`
        : "Solo DOM";

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
        capture_url: response.capture_url,
        capture_timestamp: response.capture_timestamp,
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
