import { describe, it, expect } from "vitest";
import { readH10Summary, readAMZScout } from "./overlay-reader";

const H10_REAL_HTML = `
<div id="h10-product-score" style="margin-bottom: 32px; position: relative;">
  <div id="modal-place" class="sc-ivWWxv eldlmU">
    <div class="sc-idvBfp gQPbZw sc-dRGAjo jWrZIY">
      <div class="sc-crozmw dBWRLZ">
        <div class="sc-kEiFTI iwUGof">
          <div class="sc-dZNtev iInQRL">Upgrade to Platinum or above for full access</div>
          <button class="sc-ePzlA-D nVNGU">Upgrade Now</button>
        </div>
      </div>
      <div class="sc-kWVOvY gEjIdV">
        <div class="sc-bOvJKt iiYyZZ">
          <div class="sc-iZDfiN bSLiJS">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 124"><path fill="#0081FF" d="M0 28.259v40.847h30.545V45.253L0 28.259z"></path></svg>
            <div class="sc-ftanKq jwjFCX">Product Summary for "B0GZYR5LJF"</div>
          </div>
        </div>
      </div>
    </div>
    <div class="sc-bUbLd iDfvYF">
      <div class="sc-idvBfp fMuARb sc-dRGAjo sc-fhuIZy jWrZIY iyamCg">
        <div class="sc-qTBJr jwokye">
          <a href="https://www.amazon.com/gp/bestsellers/toys-and-games/ref=pd_zg_ts_toys-and-games" class="sc-htvRET icSAve">Toys &amp; Games</a>
          <div class="sc-PIZJk etwyjj">#1,240 </div>
        </div>
        <div class="sc-qTBJr bnPjFW">
          <a href="https://www.amazon.com/gp/bestsellers/toys-and-games/2514571011/ref=pd_zg_hrsr_toys-and-games" class="sc-htvRET icSAve">Action Figures</a>
          <div class="sc-PIZJk etwyjj">#28 </div>
        </div>
      </div>
      <div class="sc-idvBfp fMuARb sc-dRGAjo jWrZIY">
        <div class="sc-fRSKyW fwOTxa">
          <div class="sc-dpeQNN loRBMP">30-Day Revenue</div>
          <div class="sc-jxwtKs NPbRm">
            <div class="sc-cPWLEn gvtTcL"><div class="sc-fIFrJn kFVtKR">Get Plan</div></div>
            <div class="sc-iYooAS hqgmNN">
              <div class="sc-gvAuPJ leTxpK">Unit Sales:</div>
              <div class="sc-bowons cGheFK">N/A</div>
            </div>
          </div>
        </div>
      </div>
      <div class="sc-idvBfp fMuARb sc-dRGAjo jWrZIY">
        <div class="sc-jaOsvB haWMrq">
          <div class="sc-gONjQg bbwoiR">Current Rating</div>
          <div class="sc-ffRsvs fxnNZj"><div class="sc-jyqtMV gdxTid">N/A</div></div>
          <button class="sc-ePzlA-D sc-jkrwHG ikNdqo gZKJdi">Analyze Reviews</button>
        </div>
      </div>
      <div class="sc-idvBfp fMuARb sc-dRGAjo jWrZIY">
        <div class="sc-jzbljy dUbmhH">
          <div class="sc-hcIrhb eYubMd">Listing Health Score</div>
          <div class="sc-hLMbYD kHJvkp">
            <div class="sc-dvPCgO hkVeBz">
              <svg class="sc-bETXeb flroZO"></svg>
              <div class="sc-dKyvAx ejhIhX">6.9</div>
            </div>
          </div>
          <button class="sc-ePzlA-D sc-hrsfkC ikNdqo smNXu">Analyze LHS</button>
        </div>
      </div>
      <div class="sc-idvBfp fMuARb sc-dRGAjo jWrZIY">
        <div class="sc-jJnOGW dyEbur">
          <div class="sc-cMrgzD oSdva">All Marketplaces</div>
        </div>
      </div>
    </div>
  </div>
</div>
`;

function makeContainer(html: string): Element {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

describe("readH10Summary", () => {
  it("extrae asin, bsr (el mas bajo) y su categoria del widget real de H10", () => {
    const products = readH10Summary(makeContainer(H10_REAL_HTML));
    expect(products).toHaveLength(1);
    expect(products[0].asin).toBe("B0GZYR5LJF");
    expect(products[0].bsr).toBe(28);
    expect(products[0].category).toBe("Action Figures");
  });

  it("extrae el Listing Health Score", () => {
    const products = readH10Summary(makeContainer(H10_REAL_HTML));
    expect(products[0].listing_health_score).toBe(6.9);
  });

  it("no inventa ventas ni rating cuando el plan free no los muestra", () => {
    const products = readH10Summary(makeContainer(H10_REAL_HTML));
    expect(products[0].estimated_monthly_sales).toBeNull();
    expect(products[0].average_rating).toBeNull();
  });

  it("devuelve vacio si el widget no tiene ASIN", () => {
    const products = readH10Summary(makeContainer("<div>Upgrade Now</div>"));
    expect(products).toHaveLength(0);
  });

  it("lee datos desde un shadow root anidado (caso real de H10)", () => {
    const host = document.createElement("div");
    host.setAttribute("id", "h10-product-score");
    const inner = document.createElement("div");
    host.appendChild(inner);
    const shadow = inner.attachShadow({ mode: "open" });
    shadow.innerHTML = H10_REAL_HTML;
    const products = readH10Summary(host);
    expect(products).toHaveLength(1);
    expect(products[0].asin).toBe("B0GZYR5LJF");
    expect(products[0].bsr).toBe(28);
    expect(products[0].category).toBe("Action Figures");
    expect(products[0].listing_health_score).toBe(6.9);
  });
});

const AMZSCOUT_TOTALS_HTML = `
<amzscout-pro class="ng-scope">
  <div class="animated as-pro-container as-pro-container__trial">
    <header class="l-header">
      <div class="totals ng-scope" ng-controller="StatisticController as s">
        <div class="totals-item ng-scope" ng-if="options.results">
          <h4 class="totals-item__title ng-binding">Results</h4>
          <span class="totals-item__val ng-binding ng-scope">1</span>
        </div>
        <div class="totals-item ng-scope totals-item_trial" ng-if="options.avgMonthlySales">
          <h4 class="totals-item__title ng-binding">Avg. Mo Sales</h4>
          <span class="totals-item__val ng-binding">1,151</span>
        </div>
        <div class="totals-item ng-scope totals-item_trial" ng-if="options.avgMonthlyRevenue">
          <h4 class="totals-item__title ng-binding">Avg. Mo Revenue</h4>
          <span class="totals-item__val ng-binding">$91,892</span>
        </div>
        <div class="totals-item ng-scope" ng-if="options.avgSalesRank">
          <h4 class="totals-item__title ng-binding">Avg. Sales Rank</h4>
          <span class="totals-item__val ng-binding">1,240</span>
        </div>
        <div class="totals-item ng-scope" ng-if="options.avgPrice">
          <h4 class="totals-item__title ng-binding">Avg. Price</h4>
          <span class="totals-item__val ng-binding">$79.99</span>
        </div>
        <div class="totals-item ng-scope" ng-if="options.avgMarginImpact">
          <h4 class="totals-item__title ng-binding">Avg. Net Margin</h4>
          <span class="totals-item__val ng-binding">80%</span>
        </div>
      </div>
    </header>
  </div>
</amzscout-pro>
`;

const AMZSCOUT_TABLE_HTML = `
<amzscout-pro class="ng-scope">
  <div class="maintable__row-wrapper">
    <div class="maintable__row">
      <div class="scout-col col-name product-image-cell">
        <a href="https://www.amazon.com/dp/B0GZYR5LJF" title="Star Wars Action Figure">Star Wars Action Figure</a>
      </div>
      <div class="scout-col col-brand"><small>Hasbro</small></div>
      <div class="scout-col col-category"><small>Toys &amp; Games</small></div>
      <div class="scout-col col-sellers">5</div>
      <section class="scout-col col-rank"><a>1,240</a></section>
      <div class="scout-col col-price"><a>$79.99</a></div>
      <div class="scout-col col-fees"><a>$8.75</a></div>
      <section class="scout-col col-mi"><span>80%</span></section>
      <section class="scout-col col-sales"><a><span>1,151</span></a></section>
      <section class="scout-col col-revenue"><div><span>$91,892</span></div></section>
      <section class="scout-col col-reviews"><a>2,345</a></section>
      <div class="scout-col col-rating"><span>4.6</span></div>
    </div>
  </div>
</amzscout-pro>
`;

const AMZSCOUT_TABLE_NICHE_HTML = `
<amzscout-pro class="ng-scope">
  <header class="l-header">
    <div class="totals ng-scope">
      <div class="totals-item ng-scope">
        <h4 class="totals-item__title ng-binding">Results</h4>
        <span class="totals-item__val ng-binding">2</span>
      </div>
    </div>
  </header>
  <div class="maintable__row-wrapper">
    <div class="maintable__row">
      <div class="scout-col col-name">
        <a href="https://www.amazon.com/dp/B0GZYR5LJF" title="Star Wars Action Figure">Star Wars Action Figure</a>
      </div>
      <div class="scout-col col-price"><a>$79.99</a></div>
      <section class="scout-col col-rank"><a>1,240</a></section>
      <section class="scout-col col-sales"><a><span>1,151</span></a></section>
      <section class="scout-col col-revenue"><div><span>$91,892</span></div></section>
    </div>
  </div>
  <div class="maintable__row-wrapper">
    <div class="maintable__row">
      <div class="scout-col col-name">
        <a href="https://www.amazon.com/dp/B0H69PVMKC" title="Other Action Figure">Other Action Figure</a>
      </div>
      <div class="scout-col col-price"><a>$29.99</a></div>
      <section class="scout-col col-rank"><a>8,512</a></section>
      <section class="scout-col col-sales"><a><span>312</span></a></section>
      <section class="scout-col col-revenue"><div><span>$9,356</span></div></section>
    </div>
  </div>
</amzscout-pro>
`;

describe("readAMZScout", () => {
  it("lee los totals del header cuando no hay tabla (pagina de producto)", () => {
    const products = readAMZScout(makeContainer(AMZSCOUT_TOTALS_HTML), "B0GZYR5LJF");
    expect(products).toHaveLength(1);
    expect(products[0].asin).toBe("B0GZYR5LJF");
    expect(products[0].estimated_monthly_sales).toBe(1151);
    expect(products[0].estimated_monthly_revenue).toBe(91892);
    expect(products[0].bsr).toBe(1240);
    expect(products[0].price).toBe(79.99);
    expect(products[0].currency).toBe("USD");
  });

  it("lee los totals con margen neto como porcentaje", () => {
    const products = readAMZScout(makeContainer(AMZSCOUT_TOTALS_HTML), "B0GZYR5LJF");
    expect(products[0].net_margin_percent).toBe(80);
  });

  it("parsea la tabla de busqueda por fila con todos los campos", () => {
    const products = readAMZScout(makeContainer(AMZSCOUT_TABLE_HTML));
    expect(products).toHaveLength(1);
    expect(products[0].asin).toBe("B0GZYR5LJF");
    expect(products[0].title).toBe("Star Wars Action Figure");
    expect(products[0].brand).toBe("Hasbro");
    expect(products[0].category).toBe("Toys & Games");
    expect(products[0].seller_count_fba).toBe(5);
    expect(products[0].bsr).toBe(1240);
    expect(products[0].price).toBe(79.99);
    expect(products[0].estimated_fba_fee).toBe(8.75);
    expect(products[0].net_margin_percent).toBe(80);
    expect(products[0].estimated_monthly_sales).toBe(1151);
    expect(products[0].estimated_monthly_revenue).toBe(91892);
    expect(products[0].review_count).toBe(2345);
    expect(products[0].average_rating).toBe(4.6);
  });

  it("en pagina de producto con tabla del nicho, devuelve SOLO la fila del ASIN abierto", () => {
    const products = readAMZScout(makeContainer(AMZSCOUT_TABLE_NICHE_HTML), "B0GZYR5LJF");
    expect(products).toHaveLength(1);
    expect(products[0].asin).toBe("B0GZYR5LJF");
    expect(products[0].price).toBe(79.99);
    expect(products[0].estimated_monthly_sales).toBe(1151);
  });

  it("en pagina de producto con tabla del nicho, si el ASIN no esta en la tabla NO aplica los totals del nicho", () => {
    const products = readAMZScout(makeContainer(AMZSCOUT_TABLE_NICHE_HTML), "B0NOTINNICHE");
    expect(products).toHaveLength(0);
  });

  it("en pagina de producto sin tabla, usa los totals del header si Results es 1 (producto abierto)", () => {
    const products = readAMZScout(makeContainer(AMZSCOUT_TOTALS_HTML), "B0GZYR5LJF");
    expect(products).toHaveLength(1);
    expect(products[0].asin).toBe("B0GZYR5LJF");
    expect(products[0].estimated_monthly_sales).toBe(1151);
  });

  it("devuelve vacio si no hay ni tabla ni totals", () => {
    expect(readAMZScout(makeContainer("<div>vacío</div>"), "B0GZYR5LJF")).toHaveLength(0);
  });
});
