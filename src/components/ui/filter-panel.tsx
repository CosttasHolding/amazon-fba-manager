"use client";

import { useState, useRef, useEffect } from "react";
import { Filter, X, ChevronDown } from "lucide-react";

interface SelectFilter {
  type: "select";
  key: string;
  label: string;
  options: { value: string; label: string }[];
  color?: string;
}

interface RangeFilter {
  type: "range";
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}

interface DateRangeFilter {
  type: "dateRange";
  key: string;
  label: string;
}

export type FilterConfig = SelectFilter | RangeFilter | DateRangeFilter;

interface SortOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
}

function countActive(filters: FilterConfig[], values: Record<string, string>): number {
  let count = 0;
  for (const f of filters) {
    if (f.type === "select" && values[f.key]) count++;
    if (f.type === "range") {
      if (values[`${f.key}Min`] !== "" && values[`${f.key}Min`] !== undefined) count++;
      if (values[`${f.key}Max`] !== "" && values[`${f.key}Max`] !== undefined) count++;
    }
    if (f.type === "dateRange") {
      if (values[`${f.key}From`]) count++;
      if (values[`${f.key}To`]) count++;
    }
  }
  return count;
}

export function FilterPanel({
  filters,
  values,
  onChange,
  onClear,
  sortOptions,
  sortValue,
  onSortChange,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeCount = countActive(filters, values);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const chips: { key: string; label: string; color: string; onRemove: () => void }[] = [];
  for (const f of filters) {
    if (f.type === "select" && values[f.key]) {
      const opt = f.options.find((o) => o.value === values[f.key]);
      chips.push({
        key: f.key,
        label: opt?.label || values[f.key],
        color: f.color || "primary",
        onRemove: () => onChange(f.key, ""),
      });
    }
    if (f.type === "range") {
      const minVal = values[`${f.key}Min`];
      const maxVal = values[`${f.key}Max`];
      if (minVal !== "" && minVal !== undefined) {
        chips.push({
          key: `${f.key}Min`,
          label: `${f.label} >= ${f.prefix || ""}${minVal}${f.suffix || ""}`,
          color: "amber",
          onRemove: () => onChange(`${f.key}Min`, ""),
        });
      }
      if (maxVal !== "" && maxVal !== undefined) {
        chips.push({
          key: `${f.key}Max`,
          label: `${f.label} <= ${f.prefix || ""}${maxVal}${f.suffix || ""}`,
          color: "amber",
          onRemove: () => onChange(`${f.key}Max`, ""),
        });
      }
    }
    if (f.type === "dateRange") {
      if (values[`${f.key}From`]) {
        chips.push({
          key: `${f.key}From`,
          label: `Desde ${values[`${f.key}From`]}`,
          color: "purple",
          onRemove: () => onChange(`${f.key}From`, ""),
        });
      }
      if (values[`${f.key}To`]) {
        chips.push({
          key: `${f.key}To`,
          label: `Hasta ${values[`${f.key}To`]}`,
          color: "purple",
          onRemove: () => onChange(`${f.key}To`, ""),
        });
      }
    }
  }

  const chipColorClass = (color: string) => {
    switch (color) {
      case "primary": return "bg-primary/10 border-primary/20 text-primary";
      case "purple": return "bg-purple-500/10 border-purple-500/20 text-purple-500";
      case "amber": return "bg-amber-500/10 border-amber-500/20 text-amber-500";
      case "green": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
      default: return "bg-primary/10 border-primary/20 text-primary";
    }
  };

  const selectClass =
    "w-full rounded-xl bg-muted/50 border border-border text-foreground text-sm px-3 py-2.5 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all";

  const inputClass =
    "w-full rounded-xl bg-muted/50 border border-border text-foreground text-sm px-3 py-2.5 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all tabular-nums";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
          open || activeCount > 0
            ? "bg-primary/10 border-primary/20 text-primary"
            : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filtros
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-[10px] font-bold text-primary">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-[460px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 p-4 sm:p-5 space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
                Filtros
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={onClear}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-all"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {sortOptions && onSortChange && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Ordenar por</label>
              <div className="relative">
                <select
                  value={sortValue || ""}
                  onChange={(e) => onSortChange(e.target.value)}
                  className={selectClass}
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filters.map((f) => {
              if (f.type === "select") {
                return (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      {f.label}
                    </label>
                    <select
                      value={values[f.key] || ""}
                      onChange={(e) => onChange(f.key, e.target.value)}
                      className={selectClass}
                    >
                      {f.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (f.type === "range") {
                return (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      {f.label}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder={`Min ${f.prefix ? `(${f.prefix})` : ""}`}
                        value={values[`${f.key}Min`] ?? ""}
                        onChange={(e) => onChange(`${f.key}Min`, e.target.value)}
                        step={f.step || 1}
                        className={inputClass}
                      />
                      <input
                        type="number"
                        placeholder={`Max ${f.prefix ? `(${f.prefix})` : ""}`}
                        value={values[`${f.key}Max`] ?? ""}
                        onChange={(e) => onChange(`${f.key}Max`, e.target.value)}
                        step={f.step || 1}
                        className={inputClass}
                      />
                    </div>
                  </div>
                );
              }

              if (f.type === "dateRange") {
                return (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      {f.label}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={values[`${f.key}From`] || ""}
                        onChange={(e) => onChange(`${f.key}From`, e.target.value)}
                        className={inputClass}
                      />
                      <input
                        type="date"
                        value={values[`${f.key}To`] || ""}
                        onChange={(e) => onChange(`${f.key}To`, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground/60">Activos:</span>
              {chips.map((chip) => (
                <span
                  key={chip.key}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${chipColorClass(chip.color)}`}
                >
                  {chip.label}
                  <button
                    onClick={chip.onRemove}
                    className="hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}