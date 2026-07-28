"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { GlobalSearch } from "@/components/global-search";

export function MobileSearchToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        title="Buscar"
        aria-label="Buscar"
      >
        <Search className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="absolute inset-x-0 top-full bg-card border-b border-border z-50 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <GlobalSearch />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Cerrar búsqueda"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="fixed inset-0 top-[56px] z-40 bg-black/20" onClick={() => setOpen(false)} />
        </>
      )}
    </>
  );
}
