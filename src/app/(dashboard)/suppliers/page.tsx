"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Factory,
  Globe,
  Star,
  Clock,
  Package,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Supplier } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTableWrapper,
  tableHeaderClass,
  tableCellClass,
  tableRowClass,
} from "@/components/ui/data-table-wrapper";
import { PaginationControl } from "@/components/ui/pagination-control";
import { SupplierFormModal } from "@/components/supplier-form-modal";
import { ExportButton } from "@/components/ui/export-button";
import { FilterPanel, FilterConfig } from "@/components/ui/filter-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import { t, type Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

const ITEMS_PER_PAGE = 10;

const renderStars = (rating: number | null, locale: Locale) => {
  if (!rating) return <span className="text-muted-foreground text-xs">{t("suppliers.no_rating", locale)}</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
};

export default function SuppliersPage() {
  const router = useRouter();
  const { locale } = useLocale();

  const SORT_OPTIONS = [
    { value: "newest", label: t("sort.newest", locale) },
    { value: "oldest", label: t("sort.oldest", locale) },
    { value: "name_asc", label: t("sort.name_asc", locale) },
    { value: "name_desc", label: t("sort.name_desc", locale) },
    { value: "rating_asc", label: t("sort.rating_asc", locale) },
    { value: "rating_desc", label: t("sort.rating_desc", locale) },
    { value: "moq_asc", label: t("sort.moq_asc", locale) },
    { value: "moq_desc", label: t("sort.moq_desc", locale) },
    { value: "lead_asc", label: t("sort.lead_time_asc", locale) },
    { value: "lead_desc", label: t("sort.lead_time_desc", locale) },
  ];
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [sortValue, setSortValue] = useState("newest");

  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "",
    country: "",
    ratingMin: "",
    ratingMax: "",
    moqMin: "",
    moqMax: "",
    leadMin: "",
    leadMax: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const json = await res.json();
        setSuppliers(json.data || json || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const countries = useMemo(() => {
    const list = [...new Set(suppliers.map((s) => s.country).filter(Boolean))] as string[];
    return list.sort();
  }, [suppliers]);

  const filterConfig: FilterConfig[] = useMemo(() => {
    const STATUS_OPTIONS = [
      { value: "", label: t("common.all_statuses", locale) },
      { value: "active", label: t("suppliers.status_active", locale) },
      { value: "inactive", label: t("suppliers.status_inactive", locale) },
    ];
    return [
      {
        type: "select",
        key: "status",
        label: t("filter.status", locale),
        options: STATUS_OPTIONS,
        color: "primary",
      },
    {
      type: "select",
      key: "country",
      label: t("filter.country", locale),
      options: [
        { value: "", label: t("suppliers.all_countries", locale) },
        ...countries.map((c) => ({ value: c, label: c })),
      ],
      color: "purple",
    },
    {
      type: "range",
      key: "rating",
      label: t("filter.rating", locale),
      min: 1,
      max: 5,
      step: 1,
      suffix: " \u2605",
    },
    {
      type: "range",
      key: "moq",
      label: t("filter.moq", locale),
      step: 1,
      suffix: ` ${t("products.units", locale)}`,
    },
    {
      type: "range",
      key: "lead",
      label: t("filter.lead_time", locale),
      step: 1,
      suffix: ` ${t("common.days", locale)}`,
    },
    ];
  }, [countries, locale]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterValues({
      status: "",
      country: "",
      ratingMin: "",
      ratingMax: "",
      moqMin: "",
      moqMax: "",
      leadMin: "",
      leadMax: "",
    });
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    let result = suppliers.filter((s) => {
      const matchSearch =
        search === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (s.country?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchStatus = !filterValues.status || s.status === filterValues.status;
      const matchCountry = !filterValues.country || s.country === filterValues.country;

      const rating = s.rating || 0;
      const matchRatingMin = filterValues.ratingMin === "" || rating >= parseFloat(filterValues.ratingMin);
      const matchRatingMax = filterValues.ratingMax === "" || rating <= parseFloat(filterValues.ratingMax);

      const moq = s.min_order_qty || 0;
      const matchMoqMin = filterValues.moqMin === "" || moq >= parseFloat(filterValues.moqMin);
      const matchMoqMax = filterValues.moqMax === "" || moq <= parseFloat(filterValues.moqMax);

      const lead = s.lead_time_days || 0;
      const matchLeadMin = filterValues.leadMin === "" || lead >= parseFloat(filterValues.leadMin);
      const matchLeadMax = filterValues.leadMax === "" || lead <= parseFloat(filterValues.leadMax);

      return matchSearch && matchStatus && matchCountry && matchRatingMin && matchRatingMax && matchMoqMin && matchMoqMax && matchLeadMin && matchLeadMax;
    });

    result.sort((a, b) => {
      switch (sortValue) {
        case "newest": return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest": return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        case "rating_asc": return (a.rating || 0) - (b.rating || 0);
        case "rating_desc": return (b.rating || 0) - (a.rating || 0);
        case "moq_asc": return (a.min_order_qty || 0) - (b.min_order_qty || 0);
        case "moq_desc": return (b.min_order_qty || 0) - (a.min_order_qty || 0);
        case "lead_asc": return (a.lead_time_days || 0) - (b.lead_time_days || 0);
        case "lead_desc": return (b.lead_time_days || 0) - (a.lead_time_days || 0);
        default: return 0;
      }
    });

    return result;
  }, [suppliers, search, filterValues, sortValue]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeCount = suppliers.filter((s) => s.status === "active").length;
  const avgRating =
    suppliers.filter((s) => s.rating).length > 0
      ? (
        suppliers.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
        suppliers.filter((s) => s.rating).length
      ).toFixed(1)
      : "N/A";

  if (loading) {
    return <PageSkeleton kpiCount={4} rowCount={6} showSearch />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        badge={t("badge.suppliers", locale)}
        title={t("nav.suppliers", locale)}
        subtitle={t("suppliers.subtitle", locale).replace("{count}", String(suppliers.length))}
        breadcrumbs={[{ label: t("nav.dashboard", locale), href: "/dashboard" }, { label: t("nav.suppliers", locale) }]}
      >
        <FilterPanel
          filters={filterConfig}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={clearFilters}
          sortOptions={SORT_OPTIONS}
          sortValue={sortValue}
          onSortChange={setSortValue}
        />

        <ExportButton type="suppliers" />

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("suppliers.new_supplier", locale)}
        </button>
      </PageHeader>

      <SupplierFormModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={fetchSuppliers}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("suppliers.total", locale)}
          value={String(suppliers.length)}
          icon={Factory}
          accentColor="cyan"
          animationDelay={0}
        />
        <KpiCard
          label={t("suppliers.active", locale)}
          value={String(activeCount)}
          icon={Package}
          accentColor="green"
          animationDelay={75}
          progressBar={suppliers.length > 0 ? Math.round((activeCount / suppliers.length) * 100) : 0}
        />
        <KpiCard
          label={t("suppliers.countries", locale)}
          value={String(countries.length)}
          icon={Globe}
          accentColor="purple"
          animationDelay={150}
        />
        <KpiCard
          label={t("suppliers.avg_rating", locale)}
          value={avgRating}
          icon={Star}
          accentColor="amber"
          animationDelay={225}
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label={t("suppliers.search_aria", locale)}
          placeholder={t("suppliers.search_placeholder", locale)}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="ps-9 bg-muted/50 border-border"
        />
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Factory}
          title={suppliers.length === 0 ? t("suppliers.empty.no_suppliers", locale) : t("common.no_results", locale)}
          subtitle={suppliers.length === 0 ? t("suppliers.empty.add_first", locale) : t("suppliers.empty.change_filters", locale)}
          action={suppliers.length === 0 ? { label: t("suppliers.add_supplier", locale), onClick: () => setShowNewModal(true) } : undefined}
        />
      )}

      {filtered.length > 0 && (
        <>
          <DataTableWrapper
            title={t("suppliers.table_title", locale).replace("{count}", String(filtered.length))}
          >
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className={tableHeaderClass}>{t("suppliers.supplier_label", locale)}</th>
                    <th scope="col" className={tableHeaderClass}>{t("filter.country", locale)}</th>
                    <th scope="col" className={tableHeaderClass}>{t("filter.rating", locale)}</th>
                    <th scope="col" className={tableHeaderClass}>{t("suppliers.moq_short", locale)}</th>
                    <th scope="col" className={tableHeaderClass}>{t("filter.lead_time", locale)}</th>
                    <th scope="col" className={tableHeaderClass}>{t("common.status", locale)}</th>
                    <th scope="col" className={`${tableHeaderClass} text-end`}>{t("suppliers.link", locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className={`${tableRowClass} cursor-pointer`}
                      onClick={() => router.push(`/suppliers/${supplier.id}`)}
                    >
                      <td className={tableCellClass}>
                        <p className="font-medium text-foreground/80">{supplier.name}</p>
                        {supplier.contact_name && (
                          <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
                        )}
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground`}>
                        {supplier.country || "—"}
                      </td>
                      <td className={tableCellClass}>
                        {renderStars(supplier.rating, locale)}
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground tabular-nums`}>
                        {supplier.min_order_qty ? `${supplier.min_order_qty} ${t("products.units", locale)}` : "—"}
                      </td>
                      <td className={`${tableCellClass} text-muted-foreground tabular-nums`}>
                        {supplier.lead_time_days ? `${supplier.lead_time_days} ${t("common.days", locale)}` : "—"}
                      </td>
                      <td className={tableCellClass}>
                        <StatusBadge status={supplier.status} />
                      </td>
                      <td className={`${tableCellClass} text-end`}>
                        {supplier.alibaba_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(supplier.alibaba_url!, "_blank");
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
              {paginated.map((supplier) => (
                <div
                  key={supplier.id}
                  className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => router.push(`/suppliers/${supplier.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground/80">{supplier.name}</p>
                      {supplier.contact_name && (
                        <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
                      )}
                    </div>
                    <StatusBadge status={supplier.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      {supplier.country || t("suppliers.no_country", locale)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      {t("suppliers.moq_short", locale)}: {supplier.min_order_qty || "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {supplier.lead_time_days ? `${supplier.lead_time_days}${t("suppliers.lead_time_short", locale)}` : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
        </>
      )}
    </div>
  );
}