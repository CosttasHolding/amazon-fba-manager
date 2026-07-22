"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { createMember, updateMember } from "@/lib/actions/members";
import { Member, type MemberRole, type MemberStatus } from "@/types";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface MemberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  member?: Member | null;
}

const inputClass = "w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelClass = "text-xs text-muted-foreground";

export function MemberFormModal({ open, onOpenChange, onSuccess, member }: MemberFormModalProps) {
  const { locale } = useLocale();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [ownershipPct, setOwnershipPct] = useState(33.33);
  const [status, setStatus] = useState<MemberStatus>("active");
  const [role, setRole] = useState<MemberRole>("editor");
  const [executorName, setExecutorName] = useState("");
  const [executorEmail, setExecutorEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      if (member) {
        setFullName(member.full_name);
        setEmail(member.email || "");
        setOwnershipPct(member.ownership_pct);
        setStatus(member.status);
        setRole(member.role);
        setExecutorName(member.executor_name || "");
        setExecutorEmail(member.executor_email || "");
        setNotes(member.notes || "");
      } else {
        setFullName("");
        setEmail("");
        setOwnershipPct(33.33);
        setStatus("active");
        setRole("editor");
        setExecutorName("");
        setExecutorEmail("");
        setNotes("");
      }
    }
  }, [open, member]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        full_name: fullName,
        email: email || null,
        ownership_pct: ownershipPct,
        status,
        role,
        executor_name: executorName || null,
        executor_email: executorEmail || null,
        notes: notes || null,
      };

      if (member) {
        await updateMember(member.id, data);
        toast.success(t("members.updated", locale));
      } else {
        await createMember(data);
        toast.success(t("members.created", locale));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error_saving", locale));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            {member ? t("members.edit_title", locale) : t("members.new_title", locale)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pe-1">
          <div className="space-y-2">
            <label htmlFor="member-full-name" className={labelClass}>{t("members.field_name", locale)}</label>
            <input
              id="member-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputClass}
              placeholder={t("members.placeholder_name", locale)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="member-email" className={labelClass}>{t("members.field_email", locale)}</label>
              <input
                id="member-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className={inputClass}
                placeholder={t("members.placeholder_email", locale)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="member-ownership-pct" className={labelClass}>{t("members.field_participation", locale)}</label>
              <input
                id="member-ownership-pct"
                value={ownershipPct}
                onChange={(e) => setOwnershipPct(Number(e.target.value))}
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="member-status" className={labelClass}>{t("members.field_status", locale)}</label>
              <select
                id="member-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
                className={inputClass}
              >
                <option value="active">{t("members.status_active", locale)}</option>
                <option value="retired">{t("members.status_retired", locale)}</option>
                <option value="deceased">{t("members.status_deceased", locale)}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="member-role" className={labelClass}>{t("members.field_role", locale)}</label>
              <select
                id="member-role"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className={inputClass}
              >
                <option value="admin">{t("role.admin", locale)}</option>
                <option value="editor">{t("role.editor", locale)}</option>
                <option value="viewer">{t("role.viewer", locale)}</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              <Shield className="h-3 w-3" />
              {t("members.executor_section", locale)}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="member-executor-name" className={labelClass}>{t("members.field_executor_name", locale)}</label>
                <input
                  id="member-executor-name"
                  value={executorName}
                  onChange={(e) => setExecutorName(e.target.value)}
                  className={inputClass}
                  placeholder={t("members.placeholder_executor", locale)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="member-executor-email" className={labelClass}>{t("members.field_executor_email", locale)}</label>
                <input
                  id="member-executor-email"
                  value={executorEmail}
                  onChange={(e) => setExecutorEmail(e.target.value)}
                  type="email"
                  className={inputClass}
                  placeholder={t("members.placeholder_executor_email", locale)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="member-notes" className={labelClass}>{t("members.field_notes", locale)}</label>
            <textarea
              id="member-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder={t("members.placeholder_notes", locale)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t("common.cancel", locale)}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {saving ? t("common.saving", locale) : (member ? t("members.save_changes", locale) : t("members.create_button", locale))}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
