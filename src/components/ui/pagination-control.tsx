"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationControl({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationControlProps) {
  const { locale } = useLocale();
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
      <p className="font-display text-xs text-muted-foreground">
        {t("pagination.showing", locale).replace("{start}", String(start)).replace("{end}", String(end)).replace("{totalItems}", String(totalItems))}
      </p>

      <div className="flex items-center gap-1" role="navigation" aria-label={t("pagination.aria_label", locale)}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={t("pagination.previous", locale)}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-lg transition-colors",
            currentPage === 1
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, index) =>
          page === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="w-11 h-11 flex items-center justify-center text-muted-foreground text-sm"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-label={t("pagination.go_to_page", locale).replace("{page}", String(page))}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-lg text-sm font-display transition-colors",
                page === currentPage
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted text-muted-foreground hover:bg-foreground/[0.08]"
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label={t("pagination.next", locale)}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-lg transition-colors",
            currentPage === totalPages
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
