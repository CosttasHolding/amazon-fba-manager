"use client";

import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MemberForm } from "@/components/member-form";
import { useMembers } from "@/hooks/use-governance";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

export default function EditMemberPage({ params }: { params: { id: string } }) {
  const { locale } = useLocale();
  const { id } = params;
  const { members, isLoading } = useMembers();
  const member = members.find((m) => m.id === id);

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
        title={t("members.edit_title", locale)}
        subtitle={member.full_name}
        breadcrumbs={[
          { label: t("members.title", locale), href: "/members" },
          { label: member.full_name, href: `/members/${id}` },
          { label: t("members.breadcrumb_edit", locale) },
        ]}
      />

      <MemberForm member={member} />
    </div>
  );
}
