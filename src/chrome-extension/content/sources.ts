export interface DetectedOverlay {
  key: string;
  container: Element;
}

const OVERLAY_SOURCES: { key: string; selectors: string[] }[] = [
  {
    key: "h10",
    selectors: [
      '[class*="xray"]',
      '[class*="Xray"]',
      '[id*="h10"]',
      '[id*="helium"]',
      '[class*="helium"]',
    ],
  },
  {
    key: "amzscout",
    selectors: [
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

export function collectOverlayDebugHtml(): { key: string; html: string }[] {
  return detectOverlays().map(({ key, container }) => ({
    key,
    html: container.outerHTML.slice(0, 20000),
  }));
}
