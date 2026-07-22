"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMember } from "@/lib/actions/members";
import { Member } from "@/types";
import { fmtPct } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-green-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {t("members.status_active", locale)}
      </span>
    );
  }
  if (status === "deceased") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {t("members.status_deceased", locale)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      {t("members.status_retired", locale)}
    </span>
  );
}

function RoleBadge({ role, locale }: { role: string; locale: Locale }) {
  const colors: Record<string, string> = {
    admin: "bg-cyan-500/10 text-cyan-500",
    editor: "bg-green-500/10 text-green-500",
    viewer: "bg-blue-500/10 text-blue-500",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[role] || "bg-muted text-muted-foreground"}`}>
      {t(`role.${role}`, locale)}
    </span>
  );
}

interface MemberDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  member: Member | null;
  onEdit?: () => void;
}

export function MemberDetailModal({ open, onOpenChange, onSuccess, member, onEdit }: MemberDetailModalProps) {
  const { locale } = useLocale();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!member || !confirm(t("members.delete_confirm", locale))) return;
    setDeleting(true);
    try {
      await deleteMember(member.id);
      toast.success(t("members.deleted", locale));
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("members.error_delete_detail", locale));
    } finally {
      setDeleting(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            {member.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground">
              {member.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={member.status} locale={locale} />
                <RoleBadge role={member.role} locale={locale} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{member.email || "—"}</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("members.detail_field_participation", locale)}</p>
              <p className="text-lg font-display font-bold text-foreground">{fmtPct(member.ownership_pct / 100)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("members.detail_field_role", locale)}</p>
              <p className="text-sm font-medium text-foreground capitalize">{t(`role.${member.role}`, locale)}</p>
            </div>
          </div>

          {(member.executor_name || member.executor_email) && (
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{t("members.detail_succession", locale)}</p>
              <div className="grid grid-cols-2 gap-3">
                {member.executor_name && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("members.detail_field_executor", locale)}</p>
                    <p className="text-sm font-medium text-foreground">{member.executor_name}</p>
                  </div>
                )}
                {member.executor_email && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("members.detail_field_executor_email", locale)}</p>
                    <p className="text-sm font-medium text-foreground">{member.executor_email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {member.notes && (
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("members.detail_notes", locale)}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            {onEdit && (
              <button
                onClick={() => { onOpenChange(false); onEdit(); }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t("members.edit_button", locale)}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {t("members.delete_button", locale)}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
