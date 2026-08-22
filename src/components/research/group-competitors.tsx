"use client";

import { Check, FolderInput, ImageOff, Pencil, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n/translations";
import type { ProductResearch } from "@/types";
import {
  competitionBadgeClass,
  fmtCompact,
  numField,
} from "@/lib/research/card-data";
import type { ResearchGroupItem } from "@/lib/research/group-data";
import { scoreBadgeClass } from "./research-card-config";

interface GroupOption {
  id: string;
  name: string;
}

interface GroupCompetitorsProps {
  items: ResearchGroupItem[];
  groups: GroupOption[];
  locale: Locale;
  onEdit: (item: ProductResearch) => void;
  onDeepDive: (item: ProductResearch) => void;
  onStatusChange: (item: ResearchGroupItem, status: string) => void;
  onMove: (item: ResearchGroupItem, groupId: string | null) => void;
}

const thClass =
  "text-start text-xs font-medium text-muted-foreground p-3 whitespace-nowrap";
const tdClass = "p-3 text-sm whitespace-nowrap";

function imageUrlOf(item: ResearchGroupItem): string | null {
  const raw = item.source_data?.image_url;
  return typeof raw === "string" && raw.trim() !== "" ? raw : null;
}

export function GroupCompetitors({
  items,
  groups,
  locale,
  onEdit,
  onDeepDive,
  onStatusChange,
  onMove,
}: GroupCompetitorsProps) {
  if (items.length === 0) {
    return (
      <div className="p-4">
        <p className="text-xs text-muted-foreground">{t("common.empty_column", locale)}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={thClass}></th>
            <th scope="col" className={thClass}>ASIN</th>
            <th scope="col" className={thClass}>{t("research.table_product", locale)}</th>
            <th scope="col" className={thClass}>Source</th>
            <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.card.score", locale)}</th>
            <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.form.monthly_sales", locale)}</th>
            <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.form.monthly_revenue", locale)}</th>
            <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.form.avg_price", locale)}</th>
            <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.card.margin", locale)}</th>
            <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">FBA</th>
            <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.card.bsr", locale)}</th>
            <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.filter.competition", locale)}</th>
            <th scope="col" className={thClass}>Fecha</th>
            <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-3 whitespace-nowrap">{t("research.table_action", locale)}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const sd = item.source_data as Record<string, unknown> | null | undefined;
            const sales = numField(sd, "estimated_monthly_sales") ?? item.estimated_monthly_sales;
            const revenue = numField(sd, "estimated_monthly_revenue") ?? item.estimated_monthly_revenue;
            const margin = numField(sd, "net_margin_percent");
            const image = imageUrlOf(item);
            return (
              <tr
                key={item.id}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onEdit(item)}
              >
                <td className={tdClass}>
                  {image ? (
                    <img src={image} alt="" className="h-8 w-8 rounded object-cover bg-muted" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                      <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  )}
                </td>
                <td className={cn(tdClass, "font-mono text-xs text-muted-foreground")}>
                  {item.asin_reference || t("common.dash", locale)}
                </td>
                <td className={cn(tdClass, "max-w-[220px] truncate")}>
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                </td>
                <td className={cn(tdClass, "text-xs text-muted-foreground")}>
                  {item.source || t("common.dash", locale)}
                </td>
                <td className="p-3 text-center">
                  {item.score != null ? (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-7 min-w-[28px] px-1 rounded-lg text-[11px] font-bold border",
                        scoreBadgeClass(item.score)
                      )}
                    >
                      {item.score}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("common.dash", locale)}</span>
                  )}
                </td>
                <td className={cn(tdClass, "text-end font-display")}>
                  {sales != null && sales > 0 ? `${fmtCompact(sales, locale)}${t("research.card.sales_month", locale)}` : t("common.dash", locale)}
                </td>
                <td className={cn(tdClass, "text-end font-display")}>
                  {revenue != null && revenue > 0 ? `$${fmtCompact(revenue, locale)}${t("research.card.revenue_month", locale)}` : t("common.dash", locale)}
                </td>
                <td className={cn(tdClass, "text-end font-display")}>
                  {item.average_price != null ? `$${item.average_price}` : t("common.dash", locale)}
                </td>
                <td className={cn(tdClass, "text-end text-emerald-400")}>
                  {margin != null ? `${margin}%` : t("common.dash", locale)}
                </td>
                <td className={cn(tdClass, "text-end")}>
                  {item.seller_count_fba ?? <span className="text-muted-foreground">{t("common.dash", locale)}</span>}
                </td>
                <td className={cn(tdClass, "text-end font-mono text-xs text-muted-foreground")}>
                  {item.bsr?.toLocaleString(locale === "en" ? "en-US" : "es-ES") ?? t("common.dash", locale)}
                </td>
                <td className="p-3 text-center">
                  {item.competition_level ? (
                    <span
                      className={cn(
                        "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded",
                        competitionBadgeClass(item.competition_level)
                      )}
                    >
                      {t("research.competition." + item.competition_level, locale)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("common.dash", locale)}</span>
                  )}
                </td>
                <td className={cn(tdClass, "text-xs text-muted-foreground")}>
                  {new Date(item.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("research.status.approved", locale)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(item, "approved");
                      }}
                      className="min-w-[32px] min-h-[32px] text-emerald-500"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("research.status.rejected", locale)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(item, "rejected");
                      }}
                      className="min-w-[32px] min-h-[32px] text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("research.deepdive.deep_dive", locale)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeepDive(item);
                      }}
                      className="min-w-[32px] min-h-[32px] text-muted-foreground"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("research.card.move_group", locale)}
                          onClick={(e) => e.stopPropagation()}
                          className="min-w-[32px] min-h-[32px] text-muted-foreground"
                        >
                          <FolderInput className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-56 bg-popover border-border p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("research.card.move_group", locale)}
                        </p>
                        {groups.length > 0 && (
                          <div className="max-h-48 overflow-y-auto">
                            {groups.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                className="w-full text-start px-2 py-1.5 text-sm rounded-md hover:bg-muted/40 text-foreground transition-colors"
                                onClick={() => onMove(item, g.id)}
                              >
                                {g.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="my-1 h-px bg-border" />
                        <button
                          type="button"
                          className="w-full text-start px-2 py-1.5 text-sm rounded-md hover:bg-muted/40 text-destructive transition-colors"
                          onClick={() => onMove(item, null)}
                        >
                          {t("research.card.remove_from_group", locale)}
                        </button>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("research.modal_edit_title", locale)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      className="min-w-[32px] min-h-[32px] text-muted-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
