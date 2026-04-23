"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Plus,
  LayoutGrid,
  List,
  Search,
  Filter,
  X,
  TrendingUp,
  Star,
  DollarSign,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProductResearch } from "@/types";

type ViewMode = "kanban" | "list";
type FilterStatus = "all" | ProductResearch["status"];

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  idea: { label: "Idea", color: "text-slate-400", border: "border-slate-500/20", bg: "bg-slate-500/5" },
  validating: { label: "Validando", color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
  approved: { label: "Aprobado", color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/5" },
  in_progress: { label: "En Progreso", color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5" },
  launched: { label: "Lanzado", color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  rejected: { label: "Rechazado", color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5" },
};

const STATUS_ORDER = ["idea", "validating", "approved", "in_progress", "launched", "rejected"];

const PRIORITY_COLORS: Record<number, string> = {
  1: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  2: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  3: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  4: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  5: "text-slate-500 bg-slate-500/5 border-slate-500/10",
};

export default function ResearchPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProductResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductResearch | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showModal]);

  // Close modal on click outside
  useEffect(() => {
    if (!showModal) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModal]);

  const [form, setForm] = useState({
    name: "", niche: "", asin_reference: "", amazon_category: "",
    estimated_monthly_sales: "", average_price: "", review_count_competitor: "",
    average_rating: "", bsr: "", competition_level: "", estimated_cogs: "",
    estimated_selling_price: "", estimated_roi: "", differentiation_notes: "",
    source: "", notes: "", status: "idea" as ProductResearch["status"], priority: "3",
  });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/research");
      if (res.ok) { const data = await res.json(); setItems(data); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.niche?.toLowerCase().includes(q) ?? false) ||
        (i.asin_reference?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterStatus !== "all") result = result.filter((i) => i.status === filterStatus);
    return result;
  }, [items, search, filterStatus]);

  const byStatus = useMemo(() => {
    const map: Record<string, ProductResearch[]> = {};
    STATUS_ORDER.forEach((s) => (map[s] = []));
    filtered.forEach((i) => { if (map[i.status]) map[i.status].push(i); });
    return map;
  }, [filtered]);

  const handleSave = async () => {
    try {
      const body = {
        name: form.name,
        niche: form.niche || null,
        asin_reference: form.asin_reference || null,
        amazon_category: form.amazon_category || null,
        estimated_monthly_sales: form.estimated_monthly_sales ? parseInt(form.estimated_monthly_sales) : null,
        average_price: form.average_price ? parseFloat(form.average_price) : null,
        review_count_competitor: form.review_count_competitor ? parseInt(form.review_count_competitor) : null,
        average_rating: form.average_rating ? parseFloat(form.average_rating) : null,
        bsr: form.bsr ? parseInt(form.bsr) : null,
        competition_level: form.competition_level || null,
        estimated_cogs: form.estimated_cogs ? parseFloat(form.estimated_cogs) : null,
        estimated_selling_price: form.estimated_selling_price ? parseFloat(form.estimated_selling_price) : null,
        estimated_roi: form.estimated_roi ? parseFloat(form.estimated_roi) : null,
        differentiation_notes: form.differentiation_notes || null,
        source: form.source || null,
        notes: form.notes || null,
        status: form.status,
        priority: parseInt(form.priority) || 3,
      };

      const url = editingItem ? `/api/research?id=${editingItem.id}` : "/api/research";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(editingItem ? "Actualizado" : "Creado");
        setShowModal(false);
        setEditingItem(null);
        resetForm();
        fetchItems();
      } else throw new Error("Error");
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/research?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Eliminado"); fetchItems(); }
    } catch { toast.error("Error al eliminar"); }
  };

  const handleStatusChange = async (item: ProductResearch, newStatus: string) => {
    try {
      const res = await fetch(`/api/research?id=${item.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchItems();
    } catch { toast.error("Error al actualizar estado"); }
  };

  const resetForm = () => setForm({
    name: "", niche: "", asin_reference: "", amazon_category: "",
    estimated_monthly_sales: "", average_price: "", review_count_competitor: "",
    average_rating: "", bsr: "", competition_level: "", estimated_cogs: "",
    estimated_selling_price: "", estimated_roi: "", differentiation_notes: "",
    source: "", notes: "", status: "idea", priority: "3",
  });

  const openEdit = (item: ProductResearch) => {
    setEditingItem(item);
    setForm({
      name: item.name, niche: item.niche || "", asin_reference: item.asin_reference || "",
      amazon_category: item.amazon_category || "", estimated_monthly_sales: item.estimated_monthly_sales?.toString() || "",
      average_price: item.average_price?.toString() || "", review_count_competitor: item.review_count_competitor?.toString() || "",
      average_rating: item.average_rating?.toString() || "", bsr: item.bsr?.toString() || "",
      competition_level: item.competition_level || "", estimated_cogs: item.estimated_cogs?.toString() || "",
      estimated_selling_price: item.estimated_selling_price?.toString() || "", estimated_roi: item.estimated_roi?.toString() || "",
      differentiation_notes: item.differentiation_notes || "", source: item.source || "",
      notes: item.notes || "", status: item.status, priority: item.priority.toString(),
    });
    setShowModal(true);
  };

  if (loading) return <PageSkeleton kpiCount={3} rowCount={6} showSearch />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader badge="RESEARCH" title="Research de Productos" subtitle={`${items.length} productos en pipeline`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-border/50">
            <button onClick={() => setView("kanban")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5", view === "kanban" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button onClick={() => setView("list")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5", view === "list" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-3.5 w-3.5" /> Lista
            </button>
          </div>
          <button onClick={() => { resetForm(); setEditingItem(null); setShowModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Buscar research" placeholder="Buscar producto, nicho, ASIN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50 border-border" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)} className="h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3">
            <option value="all">Todos los estados</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUS_ORDER.map((status) => {
            const columnItems = byStatus[status] || [];
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className={cn("min-w-[260px] w-[260px] rounded-2xl border p-3 space-y-2", cfg.border, cfg.bg)}>
                <div className="flex items-center justify-between px-1">
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", cfg.color)}>{cfg.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{columnItems.length}</span>
                </div>
                <div className="space-y-2">
                  {columnItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-card p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer group" onClick={() => openEdit(item)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{item.name}</p>
                        <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border", PRIORITY_COLORS[item.priority] || PRIORITY_COLORS[3])}>P{item.priority}</span>
                      </div>
                      {item.niche && <p className="text-[10px] text-muted-foreground">{item.niche}</p>}
                      <div className="flex flex-wrap gap-2">
                        {item.estimated_roi !== null && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <TrendingUp className="h-2.5 w-2.5" /> {item.estimated_roi}%
                          </span>
                        )}
                        {item.estimated_cogs !== null && item.estimated_selling_price !== null && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            <DollarSign className="h-2.5 w-2.5" /> ${item.estimated_selling_price}
                          </span>
                        )}
                        {item.competition_level && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded capitalize">
                            <Star className="h-2.5 w-2.5" /> {item.competition_level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("es-ES")}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select value={item.status} onClick={(e) => e.stopPropagation()} onChange={(e) => handleStatusChange(item, e.target.value)} className="text-[10px] bg-muted/50 border border-border rounded px-1 py-0.5">
                            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <DataTableWrapper title={`${filtered.length} productos`} icon={FlaskConical}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No hay productos en research"
              subtitle="Agrega tu primera idea de producto para empezar"
              action={{ label: "Nuevo Producto", onClick: () => { resetForm(); setEditingItem(null); setShowModal(true); } }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Producto</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Categoría</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">Precio Est.</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-4">ROI Est.</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">Estado</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">Prioridad</th>
                    <th className="text-center text-xs font-medium text-muted-foreground p-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEdit(item)}>
                      <td className="p-4">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        {item.niche && <p className="text-xs text-muted-foreground">{item.niche}</p>}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{item.amazon_category || "—"}</td>
                      <td className="p-4 text-right font-display text-sm text-foreground">{item.estimated_selling_price ? `$${item.estimated_selling_price}` : "—"}</td>
                      <td className="p-4 text-right font-display text-sm text-emerald-400">{item.estimated_roi ? `${item.estimated_roi}%` : "—"}</td>
                      <td className="p-4 text-center">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-medium border", STATUS_CONFIG[item.status]?.bg.replace("/5", "/10"), STATUS_CONFIG[item.status]?.color, STATUS_CONFIG[item.status]?.border)}>
                          {STATUS_CONFIG[item.status]?.label}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", PRIORITY_COLORS[item.priority])}>P{item.priority}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataTableWrapper>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div ref={modalRef} className="bg-popover border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{editingItem ? "Editar Research" : "Nuevo Producto en Research"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground">Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Nicho</Label><Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">ASIN Referencia</Label><Input value={form.asin_reference} onChange={(e) => setForm({ ...form, asin_reference: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Categoría Amazon</Label><Input value={form.amazon_category} onChange={(e) => setForm({ ...form, amazon_category: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Competencia</Label>
                <select value={form.competition_level} onChange={(e) => setForm({ ...form, competition_level: e.target.value })} className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3">
                  <option value="">—</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option>
                </select>
              </div>
              <div><Label className="text-xs text-muted-foreground">Ventas mensuales est.</Label><Input type="number" value={form.estimated_monthly_sales} onChange={(e) => setForm({ ...form, estimated_monthly_sales: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Precio promedio est.</Label><Input type="number" step="0.01" value={form.average_price} onChange={(e) => setForm({ ...form, average_price: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Reviews competidor</Label><Input type="number" value={form.review_count_competitor} onChange={(e) => setForm({ ...form, review_count_competitor: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Rating competidor</Label><Input type="number" step="0.01" value={form.average_rating} onChange={(e) => setForm({ ...form, average_rating: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">BSR</Label><Input type="number" value={form.bsr} onChange={(e) => setForm({ ...form, bsr: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">COGS est. ($)</Label><Input type="number" step="0.01" value={form.estimated_cogs} onChange={(e) => setForm({ ...form, estimated_cogs: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Precio venta est. ($)</Label><Input type="number" step="0.01" value={form.estimated_selling_price} onChange={(e) => setForm({ ...form, estimated_selling_price: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">ROI est. (%)</Label><Input type="number" step="0.01" value={form.estimated_roi} onChange={(e) => setForm({ ...form, estimated_roi: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Prioridad (1-5)</Label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3">
                  {[1,2,3,4,5].map((p) => <option key={p} value={p}>P{p} {p===1?"(Alta)":p===5?"(Baja)":""}</option>)}
                </select>
              </div>
              <div><Label className="text-xs text-muted-foreground">Estado</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductResearch["status"] })} className="w-full h-9 rounded-lg border border-border bg-muted/50 text-sm text-foreground px-3">
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground">Diferenciación</Label><Input value={form.differentiation_notes} onChange={(e) => setForm({ ...form, differentiation_notes: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
              <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground">Notas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-9 bg-muted/50 border-border text-sm" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {editingItem ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
