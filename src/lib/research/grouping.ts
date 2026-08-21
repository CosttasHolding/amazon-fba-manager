import type { CapturedProduct } from "@/lib/research/types";

export type GroupMatch = {
  group_id: string | null;
  group_name: string;
  niche: string | null;
  amazon_category: string | null;
  match: "existing" | "new" | "fallback";
};

type GroupLike = {
  id: string;
  name: string;
  niche: string | null;
  amazon_category: string | null;
  products: Array<{ asin_reference: string | null }>;
};

const STOPWORDS = new Set(["the", "de", "la", "el", "del", "y", "e", "a", "to", "for", "with", "con", "en", "para", "un", "una", "set", "kit"]);

export function normalizeItemName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .join(" ");
}

function tokensEq(a: string, b: string): boolean {
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  for (const t of ta) if (tb.has(t)) return true;
  for (const t of tb) if (ta.has(t)) return true;
  return false;
}

export function findGroupByAsin(groups: GroupLike[], asin: string | null): string | null {
  if (!asin) return null;
  const want = asin.toLowerCase();
  for (const g of groups) {
    if (g.products.some((p) => p.asin_reference?.toLowerCase() === want)) return g.id;
  }
  return null;
}

export function findGroupByNicheAndName(groups: GroupLike[], name: string, niche: string | null): string | null {
  const norm = normalizeItemName(name);
  if (!norm) return null;
  for (const g of groups) {
    if (niche && g.niche && g.niche.toLowerCase() === niche.toLowerCase()) {
      if (tokensEq(norm, normalizeItemName(g.name))) return g.id;
    }
  }
  return null;
}

export function fallbackClassify(product: CapturedProduct, groups: GroupLike[]): GroupMatch {
  const byAsin = findGroupByAsin(groups, product.asin);
  if (byAsin) {
    const g = groups.find((x) => x.id === byAsin)!;
    return { group_id: g.id, group_name: g.name, niche: g.niche, amazon_category: g.amazon_category ?? null, match: "existing" };
  }
  const byNiche = findGroupByNicheAndName(groups, product.title, product.category ?? null);
  if (byNiche) {
    const g = groups.find((x) => x.id === byNiche)!;
    return { group_id: g.id, group_name: g.name, niche: g.niche, amazon_category: g.amazon_category ?? null, match: "existing" };
  }
  return {
    group_id: null,
    group_name: product.title.slice(0, 120),
    niche: product.category ?? null,
    amazon_category: null,
    match: "new",
  };
}

export async function classifyToGroup(
  product: CapturedProduct,
  groups: GroupLike[],
  ai: "grok" | "off" = "off"
): Promise<GroupMatch> {
  if (ai === "off") return fallbackClassify(product, groups);
  try {
    const { classifyWithGrok } = await import("@/lib/research/grok-group");
    const res = await classifyWithGrok(product);
    const existing = res.match === "existing" ? groups.find((g) => g.id === res.group_id) : undefined;
    if (res.match === "existing" && existing) {
      return { group_id: existing.id, group_name: existing.name, niche: existing.niche, amazon_category: existing.amazon_category ?? null, match: "existing" };
    }
    return {
      group_id: null,
      group_name: res.group_name.slice(0, 120),
      niche: res.niche ?? null,
      amazon_category: res.amazon_category ?? null,
      match: "new",
    };
  } catch {
    return fallbackClassify(product, groups);
  }
}
