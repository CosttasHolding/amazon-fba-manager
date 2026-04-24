"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
        Mostrando {start}-{end} de {totalItems}
      </p>

      <div className="flex items-center gap-1" role="navigation" aria-label="Paginacion">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Pagina anterior"
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
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
              className="w-9 h-9 flex items-center justify-center text-muted-foreground text-sm"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-label={`Ir a pagina ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg text-sm font-display transition-colors",
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
          aria-label="Pagina siguiente"
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
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
