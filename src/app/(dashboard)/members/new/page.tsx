"use client";

import { PageHeader } from "@/components/ui/page-header";
import { MemberForm } from "@/components/member-form";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

export default function NewMemberPage() {
  const { locale } = useLocale();

  return (
    <div>
      <PageHeader
        badge={t("members.badge", locale)}
        title={t("members.new_title", locale)}
        subtitle={t("members.new_subtitle", locale)}
        breadcrumbs={[
          { label: t("members.title", locale), href: "/members" },
          { label: t("members.breadcrumb_new", locale) },
        ]}
      />

      <MemberForm />
    </div>
  );
}
