"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FormDialogLayout } from "@/components/ui/form-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { t, type Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { TRASH_ENTITIES, type TrashEntity } from "@/lib/trash";
import { inputClass, labelClass } from "@/lib/form-constants";

interface TrashItem {
  id: string;
  name: string;
  deletedAt: string;
}

interface TrashListResponse {
  data?: Array<{ id: string; name: string; deleted_at: string }>;
}

function toTrashItems(payload: TrashListResponse): TrashItem[] {
  return (payload.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    deletedAt: row.deleted_at,
  }));
}

function formatDeletedAt(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("common.dash", locale);
  return date.toLocaleDateString(locale === "en" ? "en-US" : "es-ES");
}

export default function TrashPage() {
  const { locale } = useLocale();
  const [entity, setEntity] = useState<TrashEntity>("products");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TrashItem | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmWord = t("trash.confirm_word", locale);
  const confirmReady = confirmText.trim() === confirmWord;

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams({ entity });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/trash?${params.toString()}`);
      if (!res.ok) throw new Error("Error");
      const payload = (await res.json()) as TrashListResponse;
      setItems(toTrashItems(payload));
    } catch {
      toast.error(t("common.error", locale));
    }
  }, [entity, debouncedSearch, locale]);

  useEffect(() => {
    setLoading(true);
    fetchItems().finally(() => setLoading(false));
  }, [fetchItems]);

  const handleRestore = async (item: TrashItem) => {
    setWorkingId(item.id);
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id: item.id }),
      });
      if (!res.ok) throw new Error("Error");
      toast.success(t("trash.restored_toast", locale));
      await fetchItems();
    } catch {
      toast.error(t("trash.error_restore_toast", locale));
    } finally {
      setWorkingId(null);
    }
  };

  const openConfirm = (item: TrashItem) => {
    setConfirmText("");
    setConfirmTarget(item);
  };

  const closeConfirm = () => {
    setConfirmTarget(null);
    setConfirmText("");
  };

  const handlePermanentDelete = async () => {
    if (!confirmTarget || !confirmReady || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id: confirmTarget.id }),
      });
      if (!res.ok) throw new Error("Error");
      toast.success(t("trash.deleted_toast", locale));
      closeConfirm();
      await fetchItems();
    } catch {
      toast.error(t("trash.error_delete_toast", locale));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageSkeleton kpiCount={0} rowCount={6} showSearch />;

  const entityLabel = t(`trash.entity.${entity}`, locale);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={t("trash.title", locale)}
        breadcrumbs={[
          { label: t("nav.dashboard", locale), href: "/dashboard" },
          { label: t("nav.trash", locale) },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label={t("common.search", locale)}
            placeholder={t("trash.search_placeholder", locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 bg-muted/50 border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="trash-entity" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {t("trash.entity_label", locale)}
          </Label>
          <Select value={entity} onValueChange={(v) => setEntity(v as TrashEntity)}>
            <SelectTrigger id="trash-entity" aria-label={t("trash.entity_label", locale)} className="h-9 bg-muted/50 border-border text-sm w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRASH_ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>{t(`trash.entity.${e}`, locale)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTableWrapper title={`${entityLabel} (${items.length})`} icon={Trash2}>
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Trash2} title={t("trash.empty", locale)} subtitle={t("trash.empty_subtitle", locale)} />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">{entityLabel}</th>
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-4">{t("common.date", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-4">{t("common.action", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{item.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDeletedAt(item.deletedAt, locale)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("trash.restore", locale)}
                          onClick={() => handleRestore(item)}
                          disabled={workingId !== null}
                          className="min-w-[44px] min-h-[44px]"
                        >
                          {workingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("trash.permanent", locale)}
                          onClick={() => openConfirm(item)}
                          disabled={workingId !== null}
                          className="min-w-[44px] min-h-[44px] text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataTableWrapper>

      <FormDialogLayout
        open={confirmTarget !== null}
        onOpenChange={(open) => { if (!open) closeConfirm(); }}
        title={t("trash.confirm_title", locale)}
        icon={<Trash2 className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{confirmTarget?.name}</p>
          <div className="space-y-1.5">
            <Label htmlFor="trash-confirm-input" className={labelClass}>{t("trash.confirm_hint", locale)}</Label>
            <Input
              id="trash-confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && confirmReady) handlePermanentDelete(); }}
              autoComplete="off"
              autoFocus
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={closeConfirm} disabled={deleting}>
              {t("common.cancel", locale)}
            </Button>
            <Button type="button" variant="destructive" onClick={handlePermanentDelete} disabled={!confirmReady || deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Trash2 className="h-4 w-4 me-1.5" />}
              {t("trash.permanent", locale)}
            </Button>
          </div>
        </div>
      </FormDialogLayout>
    </div>
  );
}
