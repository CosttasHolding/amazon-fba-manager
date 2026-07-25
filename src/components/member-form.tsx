"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memberSchema } from "@/validations/member";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMember, updateMember } from "@/lib/actions/members";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { inputClass } from "@/lib/form-constants";
import type { Member } from "@/types";

type MemberFormData = z.infer<typeof memberSchema>;

const errorClass = "text-xs text-destructive mt-1";
const textareaClass = "w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none";

interface MemberFormProps {
  member?: Member;
}

export function MemberForm({ member }: MemberFormProps) {
  const { locale } = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = !!member;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member
      ? {
          full_name: member.full_name,
          email: member.email || "",
          ownership_pct: member.ownership_pct,
          status: member.status,
          role: member.role || "editor",
          executor_name: member.executor_name || "",
          executor_email: member.executor_email || "",
          notes: member.notes || "",
        }
      : {
          full_name: "",
          email: "",
          ownership_pct: 33.33,
          status: "active",
          role: "editor",
          executor_name: "",
          executor_email: "",
          notes: "",
        },
  });

  const onSubmit = async (data: MemberFormData) => {
    setSaving(true);
    try {
      const payload = {
        full_name: data.full_name,
        email: data.email || null,
        ownership_pct: data.ownership_pct || 0,
        status: data.status || "active",
        role: data.role || "editor",
        executor_name: data.executor_name || null,
        executor_email: data.executor_email || null,
        notes: data.notes || null,
      };
      if (isEdit) {
        await updateMember(member.id, payload);
        toast.success(t("members.updated", locale));
        router.push(`/members/${member.id}`);
      } else {
        await createMember(payload);
        toast.success(t("members.created", locale));
        router.push("/members");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(isEdit ? "members.error_update" : "members.error_create", locale));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-medium text-foreground">{t("members.field_name", locale)}</Label>
          <Input
            id="full_name"
            {...register("full_name")}
            className={inputClass}
            placeholder={isEdit ? undefined : t("members.placeholder_name", locale)}
          />
          {errors.full_name && <p className={errorClass}>{errors.full_name.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">{t("members.field_email", locale)}</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className={inputClass}
              placeholder={isEdit ? undefined : t("members.placeholder_email", locale)}
            />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownership_pct" className="text-sm font-medium text-foreground">{t("members.field_participation", locale)}</Label>
            <Input
              id="ownership_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register("ownership_pct", { valueAsNumber: true })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm font-medium text-foreground">{t("members.field_status", locale)}</Label>
          <Select defaultValue={member?.status || "active"} onValueChange={(v) => setValue("status", v as MemberFormData["status"])}>
            <SelectTrigger id="status" className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("members.status_active", locale)}</SelectItem>
              <SelectItem value="retired">{t("members.status_retired", locale)}</SelectItem>
              <SelectItem value="deceased">{t("members.status_deceased", locale)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-medium text-foreground">{t("members.field_role", locale)}</Label>
          <Select defaultValue={member?.role || "editor"} onValueChange={(v) => setValue("role", v as MemberFormData["role"])}>
            <SelectTrigger id="role" className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">{t("role.admin", locale)}</SelectItem>
              <SelectItem value="editor">{t("role.editor", locale)}</SelectItem>
              <SelectItem value="viewer">{t("role.viewer", locale)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t("members.executor_section", locale)}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="executor_name" className="text-sm font-medium text-foreground">{t("members.field_executor_name", locale)}</Label>
              <Input
                id="executor_name"
                {...register("executor_name")}
                className={inputClass}
                placeholder={isEdit ? undefined : t("members.placeholder_executor", locale)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="executor_email" className="text-sm font-medium text-foreground">{t("members.field_executor_email", locale)}</Label>
              <Input
                id="executor_email"
                type="email"
                {...register("executor_email")}
                className={inputClass}
                placeholder={isEdit ? undefined : t("members.placeholder_executor_email", locale)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium text-foreground">{t("members.field_notes", locale)}</Label>
          <textarea
            id="notes"
            {...register("notes")}
            rows={3}
            className={textareaClass}
            placeholder={isEdit ? undefined : t("members.placeholder_notes", locale)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? t("members.saving", locale) : isEdit ? t("members.save_changes", locale) : t("members.create_button", locale)}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("members.cancel_button", locale)}
          </button>
        </div>
      </form>
    </div>
  );
}
