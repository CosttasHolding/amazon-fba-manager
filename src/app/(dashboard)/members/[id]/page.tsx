"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useMembers } from "@/hooks/use-governance";
import { fmtPct } from "@/lib/utils";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteMember } from "@/lib/actions/members";
import { toast } from "sonner";
import { t, type Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { CommentsSection } from "@/components/comments-section";

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

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const { locale } = useLocale();
  const { id } = params;
  const { members, isLoading, mutate } = useMembers();
  const router = useRouter();
  const member = members.find((m) => m.id === id);

  const handleDelete = async () => {
    if (!confirm(t("members.delete_confirm", locale))) return;
    try {
      await deleteMember(id);
      toast.success(t("members.deleted", locale));
      router.push("/members");
    } catch {
      toast.error(t("members.error_delete_detail", locale));
    }
  };

  if (isLoading) return <PageSkeleton kpiCount={0} rowCount={3} showSearch={false} />;
  if (!member) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("members.not_found", locale)}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        badge={t("members.badge", locale)}
        title={member.full_name}
        subtitle={t("members.detail_subtitle", locale)}
        breadcrumbs={[
          { label: t("members.title", locale), href: "/members" },
          { label: member.full_name },
        ]}
      >
        <div className="flex gap-2">
          <Link
            href={`/members/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-4 h-4" />
            {t("members.edit_button", locale)}
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t("members.delete_button", locale)}
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("members.detail_general", locale)}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("members.detail_field_name", locale)}</p>
                <p className="text-sm font-medium text-foreground">{member.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("members.detail_field_email", locale)}</p>
                <p className="text-sm font-medium text-foreground">{member.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("members.detail_field_participation", locale)}</p>
                <p className="text-sm font-display font-bold text-foreground">{fmtPct(member.ownership_pct / 100)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("members.detail_field_status", locale)}</p>
                <StatusBadge status={member.status} locale={locale} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("members.detail_succession", locale)}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("members.detail_field_executor", locale)}</p>
                <p className="text-sm font-medium text-foreground">{member.executor_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("members.detail_field_executor_email", locale)}</p>
                <p className="text-sm font-medium text-foreground">{member.executor_email || "—"}</p>
              </div>
            </div>
          </div>

          {member.notes && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">{t("members.detail_notes", locale)}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <CommentsSection entity="member" entityId={id} />
        </div>
      </div>
    </div>
  );
}
