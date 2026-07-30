import type { ScoringInput, ScoringResult, DimensionScore } from "./types";

function safeNum(v: number | null | undefined): number {
  return v ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function demandaScore(input: ScoringInput): DimensionScore {
  const sales = safeNum(input.estimated_monthly_sales);
  const revenue = safeNum(input.estimated_monthly_revenue);
  const bsr = safeNum(input.bsr);

  let s = 0;
  if (sales > 0) {
    s += clamp((Math.log2(sales) / 14) * 100, 0, 100);
  }
  if (revenue > 0) {
    s += clamp((Math.log2(revenue) / 18) * 20, 0, 20);
  }
  if (bsr > 0) {
    const bsrScore = clamp((1 - Math.log2(bsr) / 17) * 20, 0, 20);
    s += bsrScore;
  }

  return {
    score: Math.round(clamp(s, 0, 100)),
    label: "Demanda",
    weight: 0.35,
    details: sales > 0 ? `${sales.toLocaleString()} ventas/mes` : "Sin datos",
  };
}

function competenciaScore(input: ScoringInput): DimensionScore {
  const sellers = safeNum(input.seller_count_fba);
  const reviews = safeNum(input.review_count);
  const rating = safeNum(input.average_rating);

  if (sellers <= 0 && reviews <= 0 && rating <= 0) {
    return { score: 0, label: "Competencia", weight: 0.3, details: "Sin datos" };
  }

  let s = 100;
  if (sellers > 0) {
    s -= clamp(sellers * 3.5, 0, 75);
  }
  if (reviews > 0) {
    s -= clamp(Math.log2(reviews + 1) * 3, 0, 20);
  }
  if (rating > 0) {
    s -= clamp((5 - rating) * 5, 0, 20);
  }

  return {
    score: Math.round(clamp(s, 0, 100)),
    label: "Competencia",
    weight: 0.3,
    details: sellers > 0 ? `${sellers} sellers FBA` : "Sin datos",
  };
}

function rentabilidadScore(input: ScoringInput): DimensionScore {
  const price = safeNum(input.price);
  const fees = safeNum(input.estimated_fba_fee);
  const cogs = safeNum(input.estimated_cogs);

  if (price <= 0) return { score: 0, label: "Rentabilidad", weight: 0.25, details: "Sin precio" };

  const totalCost = fees + cogs;
  const margin = totalCost > 0 ? ((price - totalCost) / price) * 100 : 50;
  let s = clamp(margin * 1.5, 0, 100);

  return {
    score: Math.round(s),
    label: "Rentabilidad",
    weight: 0.25,
    details: margin > 0 ? `Margen ${Math.round(margin)}%` : "Margen negativo",
  };
}

function oportunidadScore(input: ScoringInput): DimensionScore {
  const bsr = safeNum(input.bsr);
  const reviews = safeNum(input.review_count);
  const rating = safeNum(input.average_rating);

  let s = 0;
  if (bsr > 0 && reviews >= 0) {
    const bsrFactor = clamp((1 - Math.log2(bsr) / 17) * 50, 0, 50);
    const reviewFactor = reviews < 100 ? 30 : reviews < 500 ? 20 : reviews < 2000 ? 10 : 0;
    const ratingGap = rating > 0 && rating < 4.0 ? 20 : 0;
    s = bsrFactor + reviewFactor + ratingGap;
  }

  return {
    score: Math.round(clamp(s, 0, 100)),
    label: "Oportunidad",
    weight: 0.1,
    details: bsr > 0 ? `BSR #${bsr}` : "Sin BSR",
  };
}

export function calculateScore(input: ScoringInput): ScoringResult {
  const demanda = demandaScore(input);
  const competencia = competenciaScore(input);
  const rentabilidad = rentabilidadScore(input);
  const oportunidad = oportunidadScore(input);

  const total = Math.round(
    demanda.score * demanda.weight +
    competencia.score * competencia.weight +
    rentabilidad.score * rentabilidad.weight +
    oportunidad.score * oportunidad.weight
  );

  return {
    total: clamp(total, 0, 100),
    dimensions: { demanda, competencia, rentabilidad, oportunidad },
  };
}
