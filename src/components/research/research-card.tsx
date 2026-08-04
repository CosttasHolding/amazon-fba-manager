"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, TrendingUp, DollarSign, Sparkles, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n/translations";
import { ProductResearch } from "@/types";
import { scoreBadgeClass, PRIORITY_COLORS, STATUS_ORDER } from "./research-card-config";
import { competitionBadgeClass, fmtCompact, numField, scoreRank } from "@/lib/research/card-data";

interface ResearchCardProps {
  item: ProductResearch;
  locale: Locale;
  onEdit: (item: ProductResearch) => void;
  onDeepDive: (item: ProductResearch) => void;
  onStatusChange: (item: ProductResearch, status: string) => void;
}

export function ResearchCard({ item, locale, onEdit, onDeepDive, onStatusChange }: ResearchCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sd = item.source_data as Record<string, unknown> | null | undefined;
  const sales = numField(sd, "estimated_monthly_sales");
  const revenue = numField(sd, "estimated_monthly_revenue");
  const margin = numField(sd, "net_margin_percent");

  const metrics: string[] = [];
  if (item.estimated_roi !== null) metrics.push(`ROI ${item.estimated_roi}%`);
  if (item.estimated_selling_price !== null) metrics.push(`$${item.estimated_selling_price}`);
  else if (item.average_price !== null) metrics.push(`$${item.average_price}`);
  if (sales !== null && sales > 0) metrics.push(`${fmtCompact(sales, locale)}${t("research.card.sales_month", locale)}`);
  if (revenue !== null && revenue > 0) metrics.push(`$${fmtCompact(revenue, locale)}${t("research.card.revenue_month", locale)}`);
  if (margin !== null) metrics.push(`${t("research.card.margin", locale)} ${margin}%`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border bg-card p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer group",
        isDragging && "opacity-40"
      )}
      onClick={() => onEdit(item)}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {item.score != null && (
            <span className={cn("shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg text-[11px] font-bold border", scoreBadgeClass(item.score))}>
              {item.score}
            </span>
          )}
          <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border", PRIORITY_COLORS[item.priority] || PRIORITY_COLORS[3])}>
            P{item.priority}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); onDeepDive(item); }}
            className="min-w-[32px] min-h-[32px] text-muted-foreground"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="min-w-[32px] min-h-[32px] cursor-grab active:cursor-grabbing text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{item.name}</p>
        {item.niche && <p className="text-[10px] text-muted-foreground line-clamp-1">{item.niche}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {item.competition_level && (
          <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded", competitionBadgeClass(item.competition_level))}>
            <Star className="h-2.5 w-2.5" /> {t("research.competition." + item.competition_level, locale)}
          </span>
        )}
        {item.score != null && (
          <span className={cn("inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground")}>
            {t("research.score_rank." + scoreRank(item.score), locale)}
          </span>
        )}
      </div>

      {metrics.length > 0 && (
        <p className="text-[10px] text-muted-foreground leading-snug">{metrics.join(" · ")}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}
        </span>
        <Select value={item.status} onValueChange={(v) => onStatusChange(item, v)}>
          <SelectTrigger className="h-7 text-[10px] bg-muted/50 border-border px-2 py-0.5" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{t("research.status." + s, locale)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}