"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Truck, Loader2, ArrowRight } from "lucide-react";

interface SearchResult {
  id: string;
  type: "product" | "supplier";
  name: string;
  subtitle: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (term: string) => {
    if (!term.trim() || term.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const encoded = encodeURIComponent(term.trim());
      const [productsRes, suppliersRes] = await Promise.all([
        fetch(`/api/products?search=${encoded}&perPage=5`),
        fetch(`/api/suppliers?search=${encoded}`),
      ]);

      const productsJson = await productsRes.json();
      const suppliersJson = await suppliersRes.json();

      const productResults: SearchResult[] = (productsJson.data || [])
        .slice(0, 5)
        .map((p: any) => ({
          id: p.id,
          type: "product" as const,
          name: p.name,
          subtitle: `SKU: ${p.sku}${p.asin ? ` · ASIN: ${p.asin}` : ""}`,
        }));

      const supplierResults: SearchResult[] = (suppliersJson.data || [])
        .slice(0, 3)
        .map((s: any) => ({
          id: s.id,
          type: "supplier" as const,
          name: s.name,
          subtitle: `${s.country || "Sin país"}${s.contact_name ? ` · ${s.contact_name}` : ""}`,
        }));

      const combined = [...productResults, ...supplierResults];
      setResults(combined);
      setOpen(combined.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const navigateTo = (result: SearchResult) => {
    const path =
      result.type === "product"
        ? `/products/${result.id}`
        : `/suppliers/${result.id}`;
    router.push(path);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        router.push(`/products?search=${encodeURIComponent(query.trim())}`);
        setQuery("");
        setOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          navigateTo(results[selectedIndex]);
        } else if (query.trim()) {
          router.push(`/products?search=${encodeURIComponent(query.trim())}`);
          setQuery("");
          setOpen(false);
        }
        break;
      case "Escape":
        setOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSelectedIndex(-1);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Buscar productos, proveedores..."
          className="w-full h-9 pl-10 pr-10 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all font-body"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-xl shadow-black/20 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Product results */}
          {results.some((r) => r.type === "product") && (
            <div>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Productos
                </p>
              </div>
              {results
                .filter((r) => r.type === "product")
                .map((result, i) => {
                  const globalIndex = results.indexOf(result);
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigateTo(result)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${
                        globalIndex === selectedIndex
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {result.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
            </div>
          )}

          {/* Supplier results */}
          {results.some((r) => r.type === "supplier") && (
            <div>
              <div className="px-3 py-2 border-b border-border border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Proveedores
                </p>
              </div>
              {results
                .filter((r) => r.type === "supplier")
                .map((result) => {
                  const globalIndex = results.indexOf(result);
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigateTo(result)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${
                        globalIndex === selectedIndex
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {result.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
            </div>
          )}

          {/* View all */}
          <button
            onClick={() => {
              router.push(
                `/products?search=${encodeURIComponent(query.trim())}`
              );
              setQuery("");
              setOpen(false);
            }}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 border-t border-border transition-colors"
          >
            Ver todos los resultados
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* No results */}
      {open && query.trim().length >= 2 && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-xl shadow-black/20 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-4 py-6 text-center">
            <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Sin resultados para &quot;{query}&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}