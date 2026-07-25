"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { researchSchema, type ResearchFormData } from "@/validations/research";
import {
  FlaskConical,
  Plus,
  LayoutGrid,
  List,
  Search,
  Filter,
  TrendingUp,
  Star,
  DollarSign,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControl } from "@/components/ui/pagination-control";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProductResearch } from "@/types";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { FormDialogLayout, FormDialogFooter } from "@/components/ui/form-dialog";
import { inputClass, labelClass } from "@/lib/form-constants";

type ViewMode = "kanban" | "list";
type FilterStatus = "all" | ProductResearch["status"];

const STATUS_CONFIG: Record<string, { color: string; border: string; bg: string }> = {
  idea: { color: "text-slate-400", border: "border-slate-500/20", bg: "bg-slate-500/5" },
  validating: { color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
  approved: { color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/5" },
  in_progress: { color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5" },
  launched: { color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  rejected: { color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5" },
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
  const { locale } = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<ProductResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductResearch | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ResearchFormData>({
    resolver: zodResolver(researchSchema),
    defaultValues: {
      name: "",
      niche: "",
      asin_reference: "",
      amazon_category: "",
      estimated_monthly_sales: null,
      average_price: null,
      review_count_competitor: null,
      average_rating: null,
      bsr: null,
      competition_level: null,
      estimated_cogs: null,
      estimated_selling_price: null,
      estimated_roi: null,
      differentiation_notes: "",
      source: "",
      notes: "",
      status: "idea",
      priority: 3,
    },
  });

  const formStatus = watch("status");
  const formPriority = watch("priority");
  const formCompetition = watch("competition_level");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/research");
      if (res.ok) { const data = await res.json(); setItems(data.data || []); }
    } catch { toast.error(t("common.error_loading_research", locale)); }
    finally { setLoading(false); }
  };

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filterStatus]);

  const filtered = useMemo(() => {
    let result = items;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.niche?.toLowerCase().includes(q) ?? false) ||
        (i.asin_reference?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterStatus !== "all") result = result.filter((i) => i.status === filterStatus);
    return result;
  }, [items, debouncedSearch, filterStatus]);

  const byStatus = useMemo(() => {
    const map: Record<string, ProductResearch[]> = {};
    STATUS_ORDER.forEach((s) => (map[s] = []));
    filtered.forEach((i) => { if (map[i.status]) map[i.status].push(i); });
    return map;
  }, [filtered]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage, ITEMS_PER_PAGE]);

  const onSubmit = async (data: ResearchFormData) => {
    setSaving(true);
    try {
      const body = {
        name: data.name || "",
        niche: data.niche || null,
        asin_reference: data.asin_reference || null,
        amazon_category: data.amazon_category || null,
        estimated_monthly_sales: data.estimated_monthly_sales ?? null,
        average_price: data.average_price ?? null,
        review_count_competitor: data.review_count_competitor ?? null,
        average_rating: data.average_rating ?? null,
        bsr: data.bsr ?? null,
        competition_level: data.competition_level || null,
        estimated_cogs: data.estimated_cogs ?? null,
        estimated_selling_price: data.estimated_selling_price ?? null,
        estimated_roi: data.estimated_roi ?? null,
        differentiation_notes: data.differentiation_notes || null,
        source: data.source || null,
        notes: data.notes || null,
        status: data.status,
        priority: data.priority ?? 3,
      };

      const url = editingItem ? `/api/research?id=${editingItem.id}` : "/api/research";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(editingItem ? t("research.toast.updated", locale) : t("research.toast.created", locale));
        setShowModal(false);
        setEditingItem(null);
        reset({
          name: "", niche: "", asin_reference: "", amazon_category: "",
          estimated_monthly_sales: null, average_price: null, review_count_competitor: null,
          average_rating: null, bsr: null, competition_level: null, estimated_cogs: null,
          estimated_selling_price: null, estimated_roi: null, differentiation_notes: "",
          source: "", notes: "", status: "idea", priority: 3,
        });
        fetchItems();
      } else throw new Error("Error");
    } catch { toast.error(t("research.toast.error_save", locale)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/research?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success(t("research.toast.deleted", locale)); fetchItems(); }
    } catch { toast.error(t("research.toast.error_delete", locale)); }
  };

  const handleStatusChange = async (item: ProductResearch, newStatus: string) => {
    try {
      const res = await fetch(`/api/research?id=${item.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchItems();
    } catch { toast.error(t("research.toast.error_status", locale)); }
  };

  const resetForm = () => reset({
    name: "", niche: "", asin_reference: "", amazon_category: "",
    estimated_monthly_sales: null, average_price: null, review_count_competitor: null,
    average_rating: null, bsr: null, competition_level: null, estimated_cogs: null,
    estimated_selling_price: null, estimated_roi: null, differentiation_notes: "",
    source: "", notes: "", status: "idea", priority: 3,
  });

  const openEdit = (item: ProductResearch) => {
    setEditingItem(item);
    reset({
      name: item.name,
      niche: item.niche || "",
      asin_reference: item.asin_reference || "",
      amazon_category: item.amazon_category || "",
      estimated_monthly_sales: item.estimated_monthly_sales,
      average_price: item.average_price,
      review_count_competitor: item.review_count_competitor,
      average_rating: item.average_rating,
      bsr: item.bsr,
      competition_level: item.competition_level,
      estimated_cogs: item.estimated_cogs,
      estimated_selling_price: item.estimated_selling_price,
      estimated_roi: item.estimated_roi,
      differentiation_notes: item.differentiation_notes || "",
      source: item.source || "",
      notes: item.notes || "",
      status: item.status,
      priority: item.priority,
    });
    setShowModal(true);
  };

  if (loading) return <PageSkeleton kpiCount={3} rowCount={6} showSearch />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader badge={t("badge.research", locale)} title={t("research.title", locale)} subtitle={t("research.subtitle", locale).replace("{count}", String(items.length))} breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.research", locale) }]}>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-border/50">
              <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setView("kanban")}>
                <LayoutGrid className="h-3.5 w-3.5 me-1" /> {t("research.kanban_view", locale)}
              </Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView("list")}>
                <List className="h-3.5 w-3.5 me-1" /> {t("research.list_view", locale)}
              </Button>
          </div>
          <Button onClick={() => { resetForm(); setEditingItem(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 me-1.5" /> {t("research.new_product", locale)}
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label={t("common.search", locale)} placeholder={t("research.search_placeholder", locale)} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 bg-muted/50 border-border" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="h-9 bg-muted/50 border-border text-sm w-[180px]">
              <SelectValue placeholder={t("common.all_statuses", locale)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all_statuses", locale)}</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{t("research.status." + s, locale)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUS_ORDER.map((status) => {
            const columnItems = byStatus[status] || [];
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className={cn("min-w-[260px] w-[260px] rounded-2xl border p-3 space-y-2", cfg.border, cfg.bg)}>
                <div className="flex items-center justify-between px-1">
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", cfg.color)}>{t("research.status." + status, locale)}</span>
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
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <TrendingUp className="h-2.5 w-2.5" /> {item.estimated_roi}%
                          </span>
                        )}
                        {item.estimated_cogs !== null && item.estimated_selling_price !== null && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            <DollarSign className="h-2.5 w-2.5" /> ${item.estimated_selling_price}
                          </span>
                        )}
                        {item.competition_level && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded capitalize">
                            <Star className="h-2.5 w-2.5" /> {item.competition_level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Select value={item.status} onValueChange={(v) => handleStatusChange(item, v)}>
                            <SelectTrigger className="h-9 text-xs bg-muted/50 border-border px-2 py-1 min-w-[44px] min-h-[44px]" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <DataTableWrapper title={t("research.count", locale).replace("{count}", String(filtered.length))} icon={FlaskConical}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title={t("research.empty_title", locale)}
              subtitle={t("research.empty_subtitle", locale)}
              action={{ label: t("research.empty_action", locale), onClick: () => { resetForm(); setEditingItem(null); setShowModal(true); } }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">{t("research.table_product", locale)}</th>
                    <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">{t("research.table_category", locale)}</th>
                    <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-4">{t("research.table_est_price", locale)}</th>
                    <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-4">{t("research.table_est_roi", locale)}</th>
                    <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-4">{t("research.table_status", locale)}</th>
                    <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-4">{t("research.table_priority", locale)}</th>
                    <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-4">{t("research.table_action", locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEdit(item)}>
                      <td className="p-4">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        {item.niche && <p className="text-xs text-muted-foreground">{item.niche}</p>}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{item.amazon_category || t("common.dash", locale)}</td>
                      <td className="p-4 text-end font-display text-sm text-foreground">{item.estimated_selling_price ? `$${item.estimated_selling_price}` : t("common.dash", locale)}</td>
                      <td className="p-4 text-end font-display text-sm text-emerald-400">{item.estimated_roi ? `${item.estimated_roi}%` : t("common.dash", locale)}</td>
                      <td className="p-4 text-center">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-medium border", STATUS_CONFIG[item.status]?.bg?.replace("/5", "/10") ?? "", STATUS_CONFIG[item.status]?.color ?? "", STATUS_CONFIG[item.status]?.border ?? "")}>
                          {t("research.status." + item.status, locale)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", PRIORITY_COLORS[item.priority])}>P{item.priority}</span>
                      </td>
                      <td className="p-4 text-center">
                        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="min-w-[44px] min-h-[44px]">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-border">
              <PaginationControl
                currentPage={currentPage}
                totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                totalItems={filtered.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </DataTableWrapper>
      )}

      <FormDialogLayout
        open={showModal}
        onOpenChange={setShowModal}
        title={editingItem ? t("research.modal_edit_title", locale) : t("research.modal_new_title", locale)}
        icon={<FlaskConical className="h-5 w-5" />}
        contentClassName="max-w-2xl bg-card border-border"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="name" className={labelClass}>{t("research.form.name", locale)}</Label>
            <Input id="name" {...register("name")} className={inputClass} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="niche" className={labelClass}>{t("research.form.niche", locale)}</Label>
            <Input id="niche" {...register("niche")} className={inputClass} />
            {errors.niche && <p className="text-xs text-destructive mt-1">{errors.niche.message}</p>}
          </div>
          <div>
            <Label htmlFor="asin_reference" className={labelClass}>{t("research.form.asin", locale)}</Label>
            <Input id="asin_reference" {...register("asin_reference")} className={inputClass} />
            {errors.asin_reference && <p className="text-xs text-destructive mt-1">{errors.asin_reference.message}</p>}
          </div>
          <div>
            <Label htmlFor="amazon_category" className={labelClass}>{t("research.form.category", locale)}</Label>
            <Input id="amazon_category" {...register("amazon_category")} className={inputClass} />
            {errors.amazon_category && <p className="text-xs text-destructive mt-1">{errors.amazon_category.message}</p>}
          </div>
          <div>
            <Label htmlFor="competition_level" className={labelClass}>{t("research.form.competition", locale)}</Label>
            <Select value={formCompetition || ""} onValueChange={(v) => setValue("competition_level", v as "low" | "medium" | "high", { shouldValidate: true })}>
              <SelectTrigger id="competition_level" className={inputClass}><SelectValue placeholder={t("common.dash", locale)} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("research.competition.low", locale)}</SelectItem>
                <SelectItem value="medium">{t("research.competition.medium", locale)}</SelectItem>
                <SelectItem value="high">{t("research.competition.high", locale)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="estimated_monthly_sales" className={labelClass}>{t("research.form.monthly_sales", locale)}</Label>
            <Input id="estimated_monthly_sales" type="number" {...register("estimated_monthly_sales", { valueAsNumber: true })} className={inputClass} />
            {errors.estimated_monthly_sales && <p className="text-xs text-destructive mt-1">{errors.estimated_monthly_sales.message}</p>}
          </div>
          <div>
            <Label htmlFor="average_price" className={labelClass}>{t("research.form.avg_price", locale)}</Label>
            <Input id="average_price" type="number" step="0.01" {...register("average_price", { valueAsNumber: true })} className={inputClass} />
            {errors.average_price && <p className="text-xs text-destructive mt-1">{errors.average_price.message}</p>}
          </div>
          <div>
            <Label htmlFor="review_count_competitor" className={labelClass}>{t("research.form.review_count", locale)}</Label>
            <Input id="review_count_competitor" type="number" {...register("review_count_competitor", { valueAsNumber: true })} className={inputClass} />
            {errors.review_count_competitor && <p className="text-xs text-destructive mt-1">{errors.review_count_competitor.message}</p>}
          </div>
          <div>
            <Label htmlFor="average_rating" className={labelClass}>{t("research.form.rating", locale)}</Label>
            <Input id="average_rating" type="number" step="0.01" {...register("average_rating", { valueAsNumber: true })} className={inputClass} />
            {errors.average_rating && <p className="text-xs text-destructive mt-1">{errors.average_rating.message}</p>}
          </div>
          <div>
            <Label htmlFor="bsr" className={labelClass}>{t("research.form.bsr", locale)}</Label>
            <Input id="bsr" type="number" {...register("bsr", { valueAsNumber: true })} className={inputClass} />
            {errors.bsr && <p className="text-xs text-destructive mt-1">{errors.bsr.message}</p>}
          </div>
          <div>
            <Label htmlFor="estimated_cogs" className={labelClass}>{t("research.form.cogs", locale)}</Label>
            <Input id="estimated_cogs" type="number" step="0.01" {...register("estimated_cogs", { valueAsNumber: true })} className={inputClass} />
            {errors.estimated_cogs && <p className="text-xs text-destructive mt-1">{errors.estimated_cogs.message}</p>}
          </div>
          <div>
            <Label htmlFor="estimated_selling_price" className={labelClass}>{t("research.form.selling_price", locale)}</Label>
            <Input id="estimated_selling_price" type="number" step="0.01" {...register("estimated_selling_price", { valueAsNumber: true })} className={inputClass} />
            {errors.estimated_selling_price && <p className="text-xs text-destructive mt-1">{errors.estimated_selling_price.message}</p>}
          </div>
          <div>
            <Label htmlFor="estimated_roi" className={labelClass}>{t("research.form.roi", locale)}</Label>
            <Input id="estimated_roi" type="number" step="0.01" {...register("estimated_roi", { valueAsNumber: true })} className={inputClass} />
            {errors.estimated_roi && <p className="text-xs text-destructive mt-1">{errors.estimated_roi.message}</p>}
          </div>
          <div>
            <Label htmlFor="priority" className={labelClass}>{t("research.form.priority", locale)}</Label>
            <Select value={String(formPriority)} onValueChange={(v) => setValue("priority", parseInt(v), { shouldValidate: true })}>
              <SelectTrigger id="priority" className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map((p) => (
                  <SelectItem key={p} value={String(p)}>P{p} {p===1?t("research.priority_high", locale):p===5?t("research.priority_low", locale):""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status" className={labelClass}>{t("research.form.status", locale)}</Label>
            <Select value={formStatus} onValueChange={(v) => setValue("status", v as ResearchFormData["status"], { shouldValidate: true })}>
              <SelectTrigger id="status" className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{t("research.status." + s, locale)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="differentiation_notes" className={labelClass}>{t("research.form.differentiation", locale)}</Label>
            <Textarea id="differentiation_notes" {...register("differentiation_notes")} className="bg-muted/50 border-border text-sm min-h-[60px]" />
            {errors.differentiation_notes && <p className="text-xs text-destructive mt-1">{errors.differentiation_notes.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes" className={labelClass}>{t("research.form.notes", locale)}</Label>
            <Textarea id="notes" {...register("notes")} className="bg-muted/50 border-border text-sm min-h-[60px]" />
            {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <FormDialogFooter
              onCancel={() => setShowModal(false)}
              saving={saving}
              locale={locale}
              saveLabel={editingItem ? t("research.modal_save_changes", locale) : t("research.modal_create", locale)}
              saveIcon={<FlaskConical className="h-4 w-4" />}
            />
          </div>
        </form>
      </FormDialogLayout>
    </div>
  );
}
