import { describe, it, expect, beforeEach } from "vitest";
import { scrapeCurrentPage, scrapeProductPage } from "./scraper";

function setAmazonSearchHtml() {
  document.body.innerHTML = `
    <div data-asin="B0ABC123XY">
      <div class="a-section">
        <h2 class="a-size-mini">
          <a class="a-link-normal s-link-style a-text-normal" href="/dp/B0ABC123XY">
            <span>Real Wireless Headphones Pro</span>
          </a>
        </h2>
        <div class="a-price">
          <span class="a-offscreen">ARS$ 89.999</span>
        </div>
        <div class="a-section" data-asin="B0ABC123XY">
          <span class="a-size-base">nested card should be deduped</span>
        </div>
      </div>
    </div>
    <div data-asin="B0ZZZ00001">
      <div class="a-section">
        <h2 class="a-size-mini">
          <a class="a-link-normal s-link-style" href="/dp/B0ZZZ00001">
            <span>Bluetooth Speaker 20W</span>
          </a>
        </h2>
        <div class="a-price">
          <span class="a-offscreen">$29.99</span>
        </div>
      </div>
    </div>
    <div>
      <span>Patrocinado Estás viendo este anuncio...</span>
      <div data-asin="B0SPON0001">
        <h2 class="a-size-mini">
          <a href="/dp/B0SPON0001"><span>Sponsored Headphones</span></a>
        </h2>
      </div>
    </div>
  `;
}

describe("scraper", () => {
  beforeEach(() => {
    setAmazonSearchHtml();
  });

  it("toma el titulo real dentro del link h2, no el texto del anuncio", () => {
    const products = scrapeCurrentPage();
    const wireless = products.find((p) => p.asin === "B0ABC123XY");
    expect(wireless?.title).toBe("Real Wireless Headphones Pro");
    expect(wireless?.title).not.toContain("Patrocinado");
  });

  it("dedupea cards anidadas con el mismo data-asin", () => {
    const products = scrapeCurrentPage();
    const asins = products.map((p) => p.asin);
    expect(asins.filter((a) => a === "B0ABC123XY")).toHaveLength(1);
  });

  it("detecta moneda local por texto", () => {
    const products = scrapeCurrentPage();
    expect(products.find((p) => p.asin === "B0ABC123XY")?.currency).toBe("ARS");
    expect(products.find((p) => p.asin === "B0ZZZ00001")?.currency).toBe("USD");
  });

  it("parsea precio localizado con puntos y comas", () => {
    const products = scrapeCurrentPage();
    const wireless = products.find((p) => p.asin === "B0ABC123XY");
    expect(wireless?.price).toBe(89999);
    expect(products.find((p) => p.asin === "B0ZZZ00001")?.price).toBe(29.99);
  });

  it("captura cards patrocinadas como productos (si tienen asin)", () => {
    const products = scrapeCurrentPage();
    expect(products.find((p) => p.asin === "B0SPON0001")?.title).toBe(
      "Sponsored Headphones"
    );
  });
});

describe("scraper product page", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/dp/B0ABC123XY");
    document.body.innerHTML = `
      <span id="productTitle">Real Wireless Headphones Pro (2026)</span>
      <div class="a-price">
        <span class="a-offscreen">$149.99</span>
      </div>
      <span class="a-icon-alt">4.5 de 5 estrellas</span>
      <span id="acrCustomerReviewText">12,345 calificaciones</span>
      <div id="detailBullets_feature_div">
        <li>Best Sellers Rank: #12,345 in Electronics</li>
      </div>
    `;
  });

  it("parsea datos de la pagina de producto", () => {
    const product = scrapeProductPage();
    expect(product?.asin).toBe("B0ABC123XY");
    expect(product?.title).toContain("Real Wireless Headphones Pro");
    expect(product?.price).toBe(149.99);
    expect(product?.average_rating).toBe(4.5);
    expect(product?.review_count).toBe(12345);
  });
});
