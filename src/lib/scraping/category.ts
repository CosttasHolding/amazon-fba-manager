import { PRODUCT_CATEGORIES } from "@/lib/constants";

const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "Electronics", keywords: ["electronic", "cell phone", "computer", "office", "video game", "audio", "camera"] },
  { category: "Toys", keywords: ["toy", "games", "board game", "puzzle"] },
  { category: "Home", keywords: ["home", "garden", "furniture", "decor", "bedding"] },
  { category: "Kitchen", keywords: ["kitchen", "cookware", "dining", "appliance"] },
  { category: "Beauty", keywords: ["beauty", "cosmetic", "skin care", "makeup", "hair", "personal care"] },
  { category: "Health", keywords: ["health", "household", "supplement", "vitamin"] },
  { category: "Sports", keywords: ["sport", "outdoor", "fitness", "exercise", "camping", "hiking"] },
  { category: "Books", keywords: ["book", "literature", "novel"] },
];

export function mapAmazonCategory(category: string | null): (typeof PRODUCT_CATEGORIES)[number] | null {
  if (!category) return null;

  const normalized = category.toLowerCase();

  for (const { category: mapped, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return mapped as (typeof PRODUCT_CATEGORIES)[number];
    }
  }

  return null;
}
