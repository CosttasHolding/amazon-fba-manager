export function detectH10Xray(): boolean {
  const selectors = [
    '[class*="xray"]',
    '[id*="h10"]',
    '[class*="helium"]',
    '[class*="Xray"]',
  ];
  return selectors.some((sel) => document.querySelector(sel) !== null);
}

export function observeH10Overlay(
  callback: (container: Element) => void
): () => void {
  const observer = new MutationObserver(() => {
    if (detectH10Xray()) {
      const container = document.querySelector('[class*="xray"], [id*="h10"], [class*="helium"]');
      if (container) {
        callback(container);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
