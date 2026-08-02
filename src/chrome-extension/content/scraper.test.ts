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

  it("ignora el badge 'Deja un comentario sobre el anuncio' como titulo", () => {
    document.body.innerHTML = `
      <div data-asin="B0ADB00001" class="AdHolder">
        <h2 class="a-size-mini">
          <a class="a-link-normal s-link-style" href="/sspa/click?url=%2Fdp%2FB0ADB00001">
            <span>Deja un comentario sobre el anuncio</span>
          </a>
        </h2>
        <h2 class="a-size-mini">
          <a href="/dp/B0ADB00001"><span>MMWOWARTS Auriculares inalámbricos Pro</span></a>
        </h2>
        <div class="a-price"><span class="a-offscreen">$49.99</span></div>
      </div>
    `;
    const products = scrapeCurrentPage();
    expect(products.find((p) => p.asin === "B0ADB00001")?.title).toBe(
      "MMWOWARTS Auriculares inalámbricos Pro"
    );
  });

  it("dedupea el mismo asin entre anuncio y card organica (prioriza titulo real)", () => {
    document.body.innerHTML = `
      <div data-asin="B0DUP00001" class="AdHolder">
        <h2><a href="/dp/B0DUP00001"><span>Deja un comentario sobre el anuncio</span></a></h2>
        <div class="a-price"><span class="a-offscreen">$99.99</span></div>
      </div>
      <div data-asin="B0DUP00001">
        <h2><a href="/dp/B0DUP00001"><span>Real Headphones 2026 Original</span></a></h2>
        <div class="a-price"><span class="a-offscreen">$89.99</span></div>
      </div>
    `;
    const products = scrapeCurrentPage();
    const dupe = products.filter((p) => p.asin === "B0DUP00001");
    expect(dupe).toHaveLength(1);
    expect(dupe[0].title).toBe("Real Headphones 2026 Original");
  });

  it("parsea el count de reviews desde el aria-label con 'valoraciones'", () => {
    document.body.innerHTML = `
      <div data-asin="B0REV00001">
        <h2><a href="/dp/B0REV00001"><span>Headphones with reviews</span></a></h2>
        <div class="a-price"><span class="a-offscreen">$49.99</span></div>
        <i class="a-icon a-icon-star-mini"><span class="a-icon-alt">4.4 de 5 estrellas</span></i>
        <a aria-label="92,984 valoraciones" class="a-link-normal s-link-style" href="/dp/B0REV00001">(92.9&nbsp;K)</a>
      </div>
    `;
    const products = scrapeCurrentPage();
    expect(products.find((p) => p.asin === "B0REV00001")?.review_count).toBe(92984);
  });

  it("parsea count de reviews con formato abreviado (92.9K) cuando no hay aria-label", () => {
    document.body.innerHTML = `
      <div data-asin="B0REV00002">
        <h2><a href="/dp/B0REV00002"><span>Headphones K format</span></a></h2>
        <div class="a-price"><span class="a-offscreen">$39.99</span></div>
        <i class="a-icon a-icon-star-mini"><span class="a-icon-alt">4.2 de 5 estrellas</span></i>
        <span class="a-size-mini puis-normal-weight-text s-underline-text">(92.9&nbsp;K)</span>
      </div>
    `;
    const products = scrapeCurrentPage();
    expect(products.find((p) => p.asin === "B0REV00002")?.review_count).toBe(92900);
  });
});

describe("scraper product page", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/dp/B0ABC123XY");
  });

  it("parsea datos de la pagina de producto", () => {
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
    const product = scrapeProductPage();
    expect(product?.asin).toBe("B0ABC123XY");
    expect(product?.title).toContain("Real Wireless Headphones Pro");
    expect(product?.price).toBe(149.99);
    expect(product?.average_rating).toBe(4.5);
    expect(product?.review_count).toBe(12345);
  });

  it("parsea BSR del HTML real de amazon (prodDetails, texto en espanol)", () => {
    document.body.innerHTML = `
      <span id="productTitle">RORSOU C6 Audifonos</span>
      <div class="a-price">
        <span class="a-offscreen">$26.99</span>
      </div>
      <div id="prodDetails">
        <h1>Informacion del producto</h1>
        <div class="a-section">
          <li><span class="a-list-item"><span>nº722 en Electrónica (<a href="/gp/bestsellers/electronics">Ver el Top 100 en Electrónica</a>)</span></span></li>
          <li><span class="a-list-item"><span>nº52 en <a href="/gp/bestsellers/electronics/12097479011">Audífonos Externos</a></span></span></li>
        </div>
      </div>
    `;
    const product = scrapeProductPage();
    expect(product?.bsr).toBe(52);
    expect(product?.category).toBe("Audífonos Externos");
  });

  it("extrae la categoria desde el BSR en espanol", () => {
    document.body.innerHTML = `
      <span id="productTitle">RORSOU C6 Audifonos</span>
      <div class="a-price">
        <span class="a-offscreen">$26.99</span>
      </div>
      <div id="prodDetails">
        <li><span class="a-list-item"><span>nº52 en <a href="/gp/bestsellers/electronics/12097479011">Audífonos Externos</a></span></span></li>
      </div>
    `;
    const product = scrapeProductPage();
    expect(product?.bsr).toBe(52);
  });

  it("extrae la marca desde bylineInfo y productOverview", () => {
    document.body.innerHTML = `
      <span id="productTitle">Wentronic Y01</span>
      <div class="a-price">
        <span class="a-offscreen">$51.99</span>
      </div>
      <a id="bylineInfo" class="a-link-normal">Visita la tienda de Wentronic</a>
      <div id="productOverview_feature_div">
        <tr class="a-spacing-small po-brand"><td><span>Marca</span></td><td><span>Wentronic</span></td></tr>
      </div>
    `;
    const product = scrapeProductPage();
    expect(product?.brand).toBe("Wentronic");
  });
});
