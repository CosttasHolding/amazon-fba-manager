import { describe, it, expect, beforeEach } from "vitest";
import { detectOverlays, collectOverlayDebugHtml } from "./sources";

describe("sources", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("detecta el host de h10 por id real (h10-page-widget)", () => {
    document.body.innerHTML = `<div id="h10-page-widget"></div>`;
    const overlays = detectOverlays();
    expect(overlays.map((o) => o.key)).toContain("h10");
  });

  it("detecta h10-product-score embebido en la ficha de producto", () => {
    document.body.innerHTML = `<div id="h10-product-score">123</div>`;
    const overlays = detectOverlays();
    expect(overlays.map((o) => o.key)).toContain("h10");
  });

  it("el debug incluye el contenido del shadow root anidado en un child (caso real H10)", () => {
    const host = document.createElement("div");
    host.id = "h10-page-widget";
    const child = document.createElement("div");
    const shadow = child.attachShadow({ mode: "open" });
    const inner = document.createElement("div");
    inner.id = "h10-bsr-container";
    inner.textContent = "nº52";
    shadow.appendChild(inner);
    host.appendChild(child);
    document.body.appendChild(host);

    const debug = collectOverlayDebugHtml();
    const h10 = debug.find((d) => d.key === "h10");
    expect(h10).toBeDefined();
    expect(h10!.html).toContain("shadow root");
    expect(h10!.html).toContain("h10-bsr-container");
    expect(h10!.html).toContain("nº52");
  });
});
