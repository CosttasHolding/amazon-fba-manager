import { describe, it, expect } from "vitest";
import { readH10Summary } from "./overlay-reader";

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
