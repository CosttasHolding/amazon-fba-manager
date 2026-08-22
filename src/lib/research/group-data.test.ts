import { describe, expect, it } from "vitest";
import type { CompetitionLevel, ResearchStatus } from "@/types";
import {
  bestScore,
  filterGroups,
  filterLooseItems,
  itemCompetition,
  sortGroups,
  type GroupFilters,
  type ResearchGroupItem,
  type ResearchGroupWithItems,
} from "./group-data";

let seq = 0;

function buildItem(overrides: Partial<ResearchGroupItem> = {}): ResearchGroupItem {
  seq += 1;
  return {
    id: `item-${seq}`,
    user_id: "user-1",
    name: `Producto ${seq}`,
    niche: null,
    asin_reference: null,
    amazon_category: null,
    estimated_monthly_sales: null,
    estimated_monthly_revenue: null,
    estimated_fba_fee: null,
    seller_count_fba: null,
    average_price: null,
    review_count_competitor: null,
    average_rating: null,
    bsr: null,
    competition_level: null,
    amazon_url: null,
    alibaba_url: null,
    estimated_cogs: null,
    estimated_selling_price: null,
    estimated_roi: null,
    differentiation_notes: null,
    keywords: null,
    status: "idea",
    priority: 3,
    source: null,
    source_data: null,
    score: null,
    notes: null,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
    group_id: null,
    ...overrides,
  };
}

function buildGroup(
  overrides: Partial<ResearchGroupWithItems> = {}
): ResearchGroupWithItems {
  seq += 1;
  return {
    id: `group-${seq}`,
    name: `Grupo ${seq}`,
    niche: null,
    amazon_category: null,
    search_keyword: null,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
    products: [],
    ...overrides,
  };
}

const ALL_FILTERS: GroupFilters = {
  q: "",
  status: "all",
  competition: "all",
  scoreRange: "all",
};

describe("bestScore", () => {
  it("devuelve el maximo score entre los items", () => {
    const group = buildGroup({
      products: [buildItem({ score: 42 }), buildItem({ score: 88 }), buildItem({ score: 61 })],
    });
    expect(bestScore(group)).toBe(88);
  });

  it("devuelve null si el grupo no tiene items", () => {
    expect(bestScore(buildGroup())).toBeNull();
  });

  it("ignora scores null y devuelve null si ninguno tiene score", () => {
    const group = buildGroup({
      products: [buildItem({ score: null }), buildItem({ score: undefined })],
    });
    expect(bestScore(group)).toBeNull();
  });
});

describe("itemCompetition", () => {
  it("devuelve el menor competition_level de los items", () => {
    const group = buildGroup({
      products: [
        buildItem({ competition_level: "high" as CompetitionLevel }),
        buildItem({ competition_level: "very_low" as CompetitionLevel }),
        buildItem({ competition_level: "medium" as CompetitionLevel }),
      ],
    });
    expect(itemCompetition(group)).toBe("very_low");
  });

  it("devuelve null si el grupo no tiene items", () => {
    expect(itemCompetition(buildGroup())).toBeNull();
  });

  it("ignora items sin competition_level", () => {
    const group = buildGroup({
      products: [buildItem(), buildItem({ competition_level: "low" as CompetitionLevel })],
    });
    expect(itemCompetition(group)).toBe("low");
  });
});

describe("sortGroups", () => {
  it("ordena por best_score descendente y manda los sin score al final", () => {
    const low = buildGroup({ name: "Low", products: [buildItem({ score: 30 })] });
    const high = buildGroup({ name: "High", products: [buildItem({ score: 90 })] });
    const empty = buildGroup({ name: "Empty", products: [] });
    const result = sortGroups([low, empty, high], "best_score");
    expect(result.map((g) => g.name)).toEqual(["High", "Low", "Empty"]);
  });

  it("ordena por competition ascendente segun ranking y nulls al final", () => {
    const high = buildGroup({
      name: "HighComp",
      products: [buildItem({ competition_level: "high" as CompetitionLevel })],
    });
    const low = buildGroup({
      name: "LowComp",
      products: [buildItem({ competition_level: "low" as CompetitionLevel })],
    });
    const none = buildGroup({ name: "NoneComp", products: [buildItem()] });
    const result = sortGroups([none, high, low], "competition");
    expect(result.map((g) => g.name)).toEqual(["LowComp", "HighComp", "NoneComp"]);
  });

  it("ordena por nombre alfabeticamente", () => {
    const c = buildGroup({ name: "Cucharas" });
    const a = buildGroup({ name: "Alfombras" });
    const b = buildGroup({ name: "Botellas" });
    const result = sortGroups([c, a, b], "name");
    expect(result.map((g) => g.name)).toEqual(["Alfombras", "Botellas", "Cucharas"]);
  });

  it("ordena por created_at mas reciente primero", () => {
    const old = buildGroup({ name: "Viejo", created_at: "2026-07-01T10:00:00.000Z" });
    const recent = buildGroup({ name: "Reciente", created_at: "2026-08-15T10:00:00.000Z" });
    const mid = buildGroup({ name: "Medio", created_at: "2026-08-01T10:00:00.000Z" });
    const result = sortGroups([old, recent, mid], "recent");
    expect(result.map((g) => g.name)).toEqual(["Reciente", "Medio", "Viejo"]);
  });

  it("no muta el array original", () => {
    const a = buildGroup({ name: "A" });
    const b = buildGroup({ name: "B" });
    const original = [b, a];
    sortGroups(original, "name");
    expect(original.map((g) => g.name)).toEqual(["B", "A"]);
  });
});

describe("filterGroups", () => {
  it("matchea q contra el nombre del grupo case-insensitive", () => {
    const g = buildGroup({ name: "Kitchen Gadgets" });
    expect(filterGroups([g], { ...ALL_FILTERS, q: "kitchen" })).toHaveLength(1);
    expect(filterGroups([g], { ...ALL_FILTERS, q: "toys" })).toHaveLength(0);
  });

  it("matchea q contra el nicho del grupo", () => {
    const g = buildGroup({ niche: "Organizacion hogar" });
    expect(filterGroups([g], { ...ALL_FILTERS, q: "hogar" })).toHaveLength(1);
  });

  it("matchea q contra asin o nombre de algun item", () => {
    const byAsin = buildGroup({
      products: [buildItem({ asin_reference: "B0CX1Y2Z3W" })],
    });
    const byName = buildGroup({
      name: "Otros",
      products: [buildItem({ name: "Tapete Silicona" })],
    });
    expect(filterGroups([byAsin], { ...ALL_FILTERS, q: "b0cx1y2z3w" })).toHaveLength(1);
    expect(filterGroups([byName], { ...ALL_FILTERS, q: "silicona" })).toHaveLength(1);
  });

  it("q vacio o espacios no filtra nada", () => {
    const g = buildGroup({ name: "Cualquiera" });
    expect(filterGroups([g], { ...ALL_FILTERS, q: "" })).toHaveLength(1);
    expect(filterGroups([g], { ...ALL_FILTERS, q: "   " })).toHaveLength(1);
  });

  it("status pasa si algun item tiene ese status", () => {
    const g = buildGroup({
      products: [
        buildItem({ status: "idea" as ResearchStatus }),
        buildItem({ status: "approved" as ResearchStatus }),
      ],
    });
    expect(filterGroups([g], { ...ALL_FILTERS, status: "approved" })).toHaveLength(1);
    expect(filterGroups([g], { ...ALL_FILTERS, status: "rejected" })).toHaveLength(0);
  });

  it("status all mantiene grupos vacios", () => {
    const empty = buildGroup();
    expect(filterGroups([empty], ALL_FILTERS)).toHaveLength(1);
  });

  it("competition usa el menor level de los items del grupo", () => {
    const g = buildGroup({
      products: [
        buildItem({ competition_level: "very_high" as CompetitionLevel }),
        buildItem({ competition_level: "low" as CompetitionLevel }),
      ],
    });
    expect(
      filterGroups([g], { ...ALL_FILTERS, competition: "low" })
    ).toHaveLength(1);
    expect(
      filterGroups([g], { ...ALL_FILTERS, competition: "very_high" })
    ).toHaveLength(0);
  });

  it("scoreRange high/mid/low opera sobre bestScore del grupo", () => {
    const high = buildGroup({ products: [buildItem({ score: 75 })] });
    const mid = buildGroup({ products: [buildItem({ score: 45 })] });
    const low = buildGroup({ products: [buildItem({ score: 12 })] });
    const noScore = buildGroup({ products: [buildItem()] });
    expect(
      filterGroups([high, mid, low, noScore], { ...ALL_FILTERS, scoreRange: "high" }).map((g) => g.name)
    ).toEqual([high.name]);
    expect(
      filterGroups([high, mid, low, noScore], { ...ALL_FILTERS, scoreRange: "mid" }).map((g) => g.name)
    ).toEqual([mid.name]);
    expect(
      filterGroups([high, mid, low, noScore], { ...ALL_FILTERS, scoreRange: "low" }).map((g) => g.name)
    ).toEqual([low.name]);
  });

  it("scoreRange excluye grupos cuyo bestScore es null", () => {
    const noScore = buildGroup({ products: [] });
    expect(
      filterGroups([noScore], { ...ALL_FILTERS, scoreRange: "high" })
    ).toHaveLength(0);
  });

  it("combina multiples criterios", () => {
    const match = buildGroup({
      name: "Mate",
      products: [
        buildItem({ status: "approved" as ResearchStatus, score: 80 }),
        buildItem({ competition_level: "medium" as CompetitionLevel }),
      ],
    });
    const other = buildGroup({
      name: "Otro",
      products: [buildItem({ status: "approved" as ResearchStatus, score: 20 })],
    });
    const filters: GroupFilters = { q: "mate", status: "approved", competition: "all", scoreRange: "high" };
    expect(filterGroups([match, other], filters)).toHaveLength(1);
  });
});

describe("filterLooseItems", () => {
  it("filtra items sueltos con los mismos criterios a nivel item", () => {
    const match = buildItem({
      name: "Bandeja Orgánica",
      status: "validating" as ResearchStatus,
      competition_level: "low" as CompetitionLevel,
      score: 72,
    });
    const other = buildItem({
      name: "Otra cosa",
      status: "idea" as ResearchStatus,
      competition_level: "high" as CompetitionLevel,
      score: 10,
    });
    const filters: GroupFilters = { q: "bandeja", status: "validating", competition: "low", scoreRange: "high" };
    expect(filterLooseItems([match, other], filters)).toEqual([match]);
  });

  it("matchea q contra niche y asin_reference", () => {
    const byNiche = buildItem({ niche: "Mascotas" });
    const byAsin = buildItem({ asin_reference: "B0ABC12345" });
    expect(filterLooseItems([byNiche], { ...ALL_FILTERS, q: "mascotas" })).toHaveLength(1);
    expect(filterLooseItems([byAsin], { ...ALL_FILTERS, q: "b0abc" })).toHaveLength(1);
  });

  it("excluye items sin score cuando hay filtro de rango", () => {
    const noScore = buildItem({ score: null });
    expect(
      filterLooseItems([noScore], { ...ALL_FILTERS, scoreRange: "mid" })
    ).toHaveLength(0);
  });
});
