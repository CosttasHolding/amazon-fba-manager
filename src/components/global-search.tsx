"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Package,
  Factory,
  ClipboardList,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "product" | "supplier" | "order" | "research";
  title: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const [productsRes, suppliersRes, ordersRes, researchRes] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/suppliers?search=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/orders?search=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/research`).then((r) => (r.ok ? r.json() : [])),
      ]);

      const items: SearchResult[] = [];
      (productsRes || []).slice(0, 5).forEach((p: { id: string; name: string; sku?: string }) => {
        items.push({ id: p.id, type: "product", title: p.name, subtitle: p.sku || "", href: `/products/${p.id}`, icon: Package });
      });
      (suppliersRes || []).slice(0, 5).forEach((s: { id: string; name: string; country?: string }) => {
        items.push({ id: s.id, type: "supplier", title: s.name, subtitle: s.country || "", href: `/suppliers/${s.id}`, icon: Factory });
      });
      (ordersRes || []).slice(0, 5).forEach((o: { id: string; po_number?: string; suppliers?: { name?: string } }) => {
        items.push({ id: o.id, type: "order", title: o.po_number || `PO-${o.id.slice(0, 8)}`, subtitle: o.suppliers?.name || "", href: `/orders/${o.id}`, icon: ClipboardList });
      });
      (researchRes || []).filter((r: { name: string }) => r.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5).forEach((r: { id: string; name: string; niche?: string }) => {
        items.push({ id: r.id, type: "research", title: r.name, subtitle: r.niche || "", href: `/research`, icon: FlaskConical });
      });

      setResults(items);
      setSelectedIndex(0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchResults(query), 200);
    return () => clearTimeout(timeout);
  }, [query, fetchResults]);

  const handleSelect = useCallback((item: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[selectedIndex]) { handleSelect(results[selectedIndex]); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, results, selectedIndex, handleSelect]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, proveedores, pedidos..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin resultados</div>
          )}
          {results.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id + item.type}
                onClick={() => handleSelect(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  idx === selectedIndex ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase shrink-0">{item.type}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
          <span className="text-[10px] text-muted-foreground">{results.length} resultados</span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span><kbd className="px-1 rounded bg-muted border border-border">↑↓</kbd> navegar</span>
            <span><kbd className="px-1 rounded bg-muted border border-border">↵</kbd> seleccionar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
