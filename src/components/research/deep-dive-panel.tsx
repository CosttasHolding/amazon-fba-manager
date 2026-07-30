"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Lightbulb,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeepDiveAnalysis {
  summary: string;
  pain_points: string[];
  differentiation_opportunities: string[];
  market_fit: "high" | "medium" | "low";
  market_fit_reason: string;
  risk_factors: string[];
  recommended_actions: string[];
  estimated_difficulty: "easy" | "moderate" | "hard";
}

interface ScoringData {
  total: number;
  dimensions: Record<string, { score: number; label: string; weight: number; details?: string }>;
}

export interface DeepDiveSaveData {
  name: string;
  asin_reference: string;
  amazon_category: string | null;
  estimated_monthly_sales: number | null;
  average_price: number | null;
  review_count_competitor: number | null;
  average_rating: number | null;
  bsr: number | null;
  source: "deep_dive";
  status: "validating";
}

interface DeepDivePanelProps {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  reviewCount: number | null;
  averageRating: number | null;
  estimatedMonthlySales: number | null;
  category: string | null;
  brand: string | null;
  onSave: (data: DeepDiveSaveData) => void;
  onClose: () => void;
}

function scoreTextColor(score: number): string {
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-rose-500";
}

function scoreBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

const difficultyConfig: Record<DeepDiveAnalysis["estimated_difficulty"], { label: string; className: string }> = {
  easy: { label: "Fácil", className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  moderate: { label: "Moderada", className: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  hard: { label: "Difícil", className: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
};

const marketFitConfig: Record<DeepDiveAnalysis["market_fit"], { label: string; className: string }> = {
  high: { label: "Alto", className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  medium: { label: "Medio", className: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  low: { label: "Bajo", className: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
};

export function DeepDivePanel({
  asin,
  title,
  price,
  bsr,
  reviewCount,
  averageRating,
  estimatedMonthlySales,
  category,
  brand,
  onSave,
  onClose,
}: DeepDivePanelProps) {
  const [scoring, setScoring] = useState<ScoringData | null>(null);
  const [analysis, setAnalysis] = useState<DeepDiveAnalysis | null>(null);
  const [loadingScoring, setLoadingScoring] = useState(false);
  const [loadingDeep, setLoadingDeep] = useState(false);

  const handleScoring = async () => {
    setLoadingScoring(true);
    try {
      const res = await fetch("/api/research/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimated_monthly_sales: estimatedMonthlySales,
          bsr,
          review_count: reviewCount,
          average_rating: averageRating,
          price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al calcular el scoring");
        return;
      }

      setScoring(data as ScoringData);
    } catch {
      toast.error("Error de conexión al calcular el scoring");
    } finally {
      setLoadingScoring(false);
    }
  };

  const handleDeepDive = async () => {
    setLoadingDeep(true);
    try {
      const res = await fetch("/api/research/analyze-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin,
          title,
          price,
          bsr,
          review_count: reviewCount,
          average_rating: averageRating,
          estimated_monthly_sales: estimatedMonthlySales,
          category,
          brand,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error en el análisis deep dive");
        return;
      }

      setAnalysis(data.analysis as DeepDiveAnalysis);
    } catch {
      toast.error("Error de conexión en el análisis deep dive");
    } finally {
      setLoadingDeep(false);
    }
  };

  const handleSave = () => {
    onSave({
      name: title,
      asin_reference: asin,
      amazon_category: category,
      estimated_monthly_sales: estimatedMonthlySales,
      average_price: price,
      review_count_competitor: reviewCount,
      average_rating: averageRating,
      bsr,
      source: "deep_dive",
      status: "validating",
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">ASIN: {asin}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleScoring} disabled={loadingScoring || loadingDeep}>
            {loadingScoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loadingScoring ? "Calculando..." : "Scoring"}
          </Button>
          <Button size="sm" onClick={handleDeepDive} disabled={loadingDeep || loadingScoring}>
            {loadingDeep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loadingDeep ? "Analizando..." : "Deep Dive IA"}
          </Button>
        </div>
      </div>

      {scoring && (
        <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Score total</p>
            <p className={cn("text-2xl font-bold", scoreTextColor(scoring.total))}>{scoring.total}</p>
          </div>
          <div className="space-y-3">
            {Object.entries(scoring.dimensions).map(([key, dimension]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {dimension.label}
                    <span className="ml-1.5 text-muted-foreground">({Math.round(dimension.weight * 100)}%)</span>
                  </span>
                  <span className={cn("font-medium", scoreTextColor(dimension.score))}>{dimension.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", scoreBarColor(dimension.score))}
                    style={{ width: `${dimension.score}%` }}
                  />
                </div>
                {dimension.details && <p className="text-[10px] text-muted-foreground">{dimension.details}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-2.5">
            <p className="text-sm text-foreground">{analysis.summary}</p>
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  difficultyConfig[analysis.estimated_difficulty].className
                )}
              >
                Dificultad: {difficultyConfig[analysis.estimated_difficulty].label}
              </span>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  marketFitConfig[analysis.market_fit].className
                )}
              >
                Market fit: {marketFitConfig[analysis.market_fit].label}
              </span>
            </div>
            {analysis.market_fit_reason && (
              <p className="text-xs text-muted-foreground">{analysis.market_fit_reason}</p>
            )}
          </div>

          <AnalysisList
            icon={AlertTriangle}
            title="Pain points"
            items={analysis.pain_points}
            iconClassName="text-amber-500"
          />
          <AnalysisList
            icon={Lightbulb}
            title="Oportunidades de diferenciación"
            items={analysis.differentiation_opportunities}
            iconClassName="text-emerald-500"
          />
          <AnalysisList
            icon={ShieldAlert}
            title="Factores de riesgo"
            items={analysis.risk_factors}
            iconClassName="text-rose-500"
          />
          <AnalysisList
            icon={Target}
            title="Acciones recomendadas"
            items={analysis.recommended_actions}
            iconClassName="text-primary"
          />
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={handleSave}>Guardar en Research</Button>
      </div>
    </div>
  );
}

function AnalysisList({
  icon: Icon,
  title,
  items,
  iconClassName,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  iconClassName?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconClassName)} />
        <p className="text-xs font-medium text-foreground">{title}</p>
      </div>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-xs text-muted-foreground">
            <span className="text-muted-foreground/50">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
