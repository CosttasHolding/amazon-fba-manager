"use client";

import { useState } from "react";
import { ChevronDown, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/translations";
import { t } from "@/lib/i18n/translations";
import {
  bestScore,
  itemCompetition,
  type ResearchGroupItem,
  type ResearchGroupWithItems,
} from "@/lib/research/group-data";
import { competitionBadgeClass } from "@/lib/research/card-data";
import type { ProductResearch } from "@/types";
import { scoreBadgeClass } from "./research-card-config";
import { GroupCompetitors } from "./group-competitors";

interface GroupCardProps {
  group: ResearchGroupWithItems;
  groups: { id: string; name: string }[];
  locale: Locale;
  onEdit: (item: ProductResearch) => void;
  onDeepDive: (item: ProductResearch) => void;
  onStatusChange: (item: ResearchGroupItem, status: string) => void;
  onMove: (item: ResearchGroupItem, groupId: string | null) => void;
}

export function GroupCard({
  group,
  groups,
  locale,
  onEdit,
  onDeepDive,
  onStatusChange,
  onMove,
}: GroupCardProps) {
  const [open, setOpen] = useState(false);
  const score = bestScore(group);
  const competition = itemCompetition(group);
  const otherGroups = groups.filter((g) => g.id !== group.id);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FolderOpen className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
          {group.niche && (
            <p className="text-xs text-muted-foreground truncate">{group.niche}</p>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          {group.products.length}
        </span>
        {score != null && (
          <span
            className={cn(
              "shrink-0 hidden sm:inline-flex items-center justify-center h-7 min-w-[28px] px-1 rounded-lg text-[11px] font-bold border",
              scoreBadgeClass(score)
            )}
          >
            {score}
          </span>
        )}
        {competition && (
          <span
            className={cn(
              "shrink-0 hidden md:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded",
              competitionBadgeClass(competition)
            )}
          >
            {t("research.competition." + competition, locale)}
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-border bg-muted/5">
          <GroupCompetitors
            items={group.products}
            groups={otherGroups}
            locale={locale}
            onEdit={onEdit}
            onDeepDive={onDeepDive}
            onStatusChange={onStatusChange}
            onMove={onMove}
          />
        </div>
      )}
    </div>
  );
}
