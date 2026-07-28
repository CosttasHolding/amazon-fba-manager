"use client";

import { useState } from "react";
import { Plus, Users, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Member } from "@/types";
import Link from "next/link";
import { fmtPct } from "@/lib/utils";
import { deleteMember } from "@/lib/actions/members";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-green-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {t("members.status_active", locale)}
      </span>
    );
  }
  if (status === "deceased") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {t("members.status_deceased", locale)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      {t("members.status_retired", locale)}
    </span>
  );
}

export function MembersTable({ members }: { members: Member[] }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(t("members.delete_confirm", locale))) return;
    setDeletingId(id);
    try {
      await deleteMember(id);
      toast.success(t("members.deleted", locale));
      router.refresh();
    } catch {
      toast.error(t("members.error_delete", locale));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        badge={t("members.badge", locale)}
        title={t("members.title", locale)}
        subtitle={t("members.subtitle", locale)}
        breadcrumbs={[{ label: t("members.title", locale) }]}
      >
        <Link
          href="/members/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t("members.new_button", locale)}
        </Link>
      </PageHeader>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground mb-1">{t("members.empty_title", locale)}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("members.empty_subtitle", locale)}</p>
          <Link
            href="/members/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t("members.empty_action", locale)}
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground px-4 py-3">{t("members.table_name", locale)}</th>
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">{t("members.table_email", locale)}</th>
                  <th scope="col" className="text-end text-xs font-medium text-muted-foreground px-4 py-3">{t("members.table_participation", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground px-4 py-3">{t("members.table_status", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">{t("members.table_executor", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground px-4 py-3">{t("members.table_actions", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member: Member) => (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{member.email || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="text-sm font-display font-semibold text-foreground">
                        {fmtPct(member.ownership_pct / 100)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={member.status} locale={locale} />
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{member.executor_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/members/${member.id}`}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          title={t("members.view_detail", locale)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/members/${member.id}/edit`}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          title={t("members.edit", locale)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                          title={t("members.delete", locale)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
