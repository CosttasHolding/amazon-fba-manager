"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { AnalyzeProductResponse } from "@/lib/ai/types";

interface ProductAnalyzerProps {
  onSave: (data: Record<string, unknown>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductAnalyzer({ onSave, open, onOpenChange }: ProductAnalyzerProps) {
  const [asinInput, setAsinInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ asin: string; image_url: string | null; analysis: AnalyzeProductResponse } | null>(null);

  const handleAnalyze = async () => {
    if (!asinInput.trim()) {
      toast.error("Ingresá un ASIN o URL de Amazon");
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const res = await fetch("/api/research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: asinInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al analizar el producto");
        return;
      }

      setResult(data);
      toast.success("Análisis completado");
    } catch {
      toast.error("Error de conexión al analizar el producto");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    onSave({
      name: result.analysis.name,
      asin_reference: result.asin,
      niche: result.analysis.niche,
      amazon_category: result.analysis.amazon_category,
      estimated_monthly_sales: result.analysis.estimated_monthly_sales,
      average_price: result.analysis.average_price,
      review_count_competitor: result.analysis.review_count_competitor,
      average_rating: result.analysis.average_rating,
      bsr: result.analysis.bsr,
      competition_level: result.analysis.competition_level,
      estimated_cogs: result.analysis.estimated_cogs,
      estimated_selling_price: result.analysis.estimated_selling_price,
      estimated_roi: result.analysis.estimated_roi,
      differentiation_notes: result.analysis.differentiation_notes,
      keywords: result.analysis.keywords,
      notes: result.analysis.notes,
      source: "amazon",
      status: "validating",
    });
    setResult(null);
    setAsinInput("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setResult(null);
    setAsinInput("");
    onOpenChange(false);
  };

  const competitionColor = (level: string | null) => {
    if (level === "high") return "text-rose-500 bg-rose-500/10";
    if (level === "medium") return "text-amber-500 bg-amber-500/10";
    return "text-emerald-500 bg-emerald-500/10";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análisis de Producto con IA
          </DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="B08XYZ123 o https://amazon.com/dp/B08XYZ123"
                value={asinInput}
                onChange={(e) => setAsinInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
                className="flex-1"
                disabled={analyzing}
              />
              <Button onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analyzing ? "Analizando..." : "Analizar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pegá un ASIN de Amazon o una URL completa de producto. El bot analizará el producto usando SP-API + IA.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              {result.image_url && (
                <img src={result.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{result.analysis.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ASIN: {result.asin}</p>
                {result.analysis.amazon_category && (
                  <p className="text-xs text-muted-foreground">{result.analysis.amazon_category}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <DataBadge label="Ventas/mes" value={result.analysis.estimated_monthly_sales ? `${result.analysis.estimated_monthly_sales.toLocaleString()}` : null} />
              <DataBadge label="Precio prom." value={result.analysis.average_price ? `$${result.analysis.average_price}` : null} />
              <DataBadge label="Reviews top" value={result.analysis.review_count_competitor ? result.analysis.review_count_competitor.toLocaleString() : null} />
              <DataBadge label="Rating" value={result.analysis.average_rating ? `${result.analysis.average_rating}/5` : null} />
              <DataBadge label="BSR" value={result.analysis.bsr ? `#${result.analysis.bsr}` : null} />
              <DataBadge label="Competencia" value={result.analysis.competition_level ? result.analysis.competition_level.charAt(0).toUpperCase() + result.analysis.competition_level.slice(1) : null} className={result.analysis.competition_level ? competitionColor(result.analysis.competition_level) : ""} />
              <DataBadge label="COGS est." value={result.analysis.estimated_cogs ? `$${result.analysis.estimated_cogs}` : null} />
              <DataBadge label="Precio venta" value={result.analysis.estimated_selling_price ? `$${result.analysis.estimated_selling_price}` : null} />
              <DataBadge label="ROI est." value={result.analysis.estimated_roi ? `${result.analysis.estimated_roi}%` : null} />
            </div>

            {result.analysis.differentiation_notes && (
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Diferenciación</p>
                <p className="text-sm text-foreground">{result.analysis.differentiation_notes}</p>
              </div>
            )}

            {result.analysis.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.analysis.keywords.map((kw, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {result.analysis.notes && (
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notas del análisis</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{result.analysis.notes}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar en Research</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DataBadge({ label, value, className }: { label: string; value: string | null; className?: string }) {
  return (
    <div className={`p-2.5 rounded-xl border border-border bg-card ${className ?? ""}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value ?? "-"}</p>
    </div>
  );
}
