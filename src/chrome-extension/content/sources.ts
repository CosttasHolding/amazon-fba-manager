export interface DetectedOverlay {
  key: string;
  container: Element;
}

const OVERLAY_SOURCES: { key: string; selectors: string[] }[] = [
  {
    key: "h10",
    selectors: [
      '[id*="h10-xray"]',
      '[id="h10-product-score"]',
      '[id="h10-bsr-container"]',
      '[id="h10-page-widget"]',
      '[id="h10-price-checker"]',
      '[id="h10-sales-estimator"]',
      '[id*="h10-bsr"]',
      '[id*="h10-xray"]',
      '[class*="xray"]',
      '[class*="Xray"]',
      '[id*="helium"]',
      '[class*="helium"]',
    ],
  },
  {
    key: "amzscout",
    selectors: [
      "amzscout-pro",
      '[id*="amzscout"]',
      '[id*="amz-scout"]',
      '[class*="amzscout"]',
      '[class*="amz-scout"]',
    ],
  },
  {
    key: "keepa",
    selectors: [
      '[id*="keepa"]',
      '[class*="keepa"]',
      '[data-tooltip*="keepa"]',
    ],
  },
];

export function detectOverlays(): DetectedOverlay[] {
  const overlays: DetectedOverlay[] = [];
  for (const source of OVERLAY_SOURCES) {
    for (const selector of source.selectors) {
      const container = document.querySelector(selector);
      if (container) {
        overlays.push({ key: source.key, container });
        break;
      }
    }
  }
  return overlays;
}

export function overlayContentFingerprint(): string {
  return detectOverlays()
    .map((o) => `${o.key}:${(o.container.textContent || "").trim().length}`)
    .join("|");
}

function deepestShadowElement(el: Element): Element {
  let current = el;
  let changed = true;
  while (changed) {
    changed = false;
    for (const child of Array.from(current.children)) {
      if (child.shadowRoot) {
        current = child;
        changed = true;
      }
    }
  }
  return current;
}

function outerHtmlIncludingShadow(el: Element): string {
  const target = deepestShadowElement(el);
  if (target.shadowRoot) {
    return target.outerHTML + "\n<!-- shadow root: " + target.shadowRoot.innerHTML.length + " chars -->\n" + target.shadowRoot.innerHTML;
  }
  return el.outerHTML;
}

export function collectOverlayDebugHtml(): { key: string; html: string }[] {
  return detectOverlays().map(({ key, container }) => ({
    key,
    html: outerHtmlIncludingShadow(container).slice(0, 20000),
  }));
}
