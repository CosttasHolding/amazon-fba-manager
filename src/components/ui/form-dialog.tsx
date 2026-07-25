"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { t, type Locale } from "@/lib/i18n/translations";

interface FormDialogLayoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  titleClassName?: string;
}

export function FormDialogLayout({
  open,
  onOpenChange,
  title,
  icon,
  children,
  contentClassName = "max-w-lg bg-card border-border",
  titleClassName = "text-foreground flex items-center gap-2",
}: FormDialogLayoutProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle className={titleClassName}>
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface FormDialogFooterProps {
  onCancel: () => void;
  saving: boolean;
  locale: Locale;
  saveLabel: string;
  saveIcon?: ReactNode;
  sticky?: boolean;
}

export function FormDialogFooter({
  onCancel,
  saving,
  locale,
  saveLabel,
  saveIcon,
  sticky = false,
}: FormDialogFooterProps) {
  return (
    <div
      className={
        "flex justify-end gap-2 pt-2 border-t border-border" +
        (sticky ? " sticky bottom-0 bg-card pb-1" : "")
      }
    >
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {t("common.cancel", locale)}
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saveIcon}
        {saving ? t("common.saving", locale) : saveLabel}
      </button>
    </div>
  );
}
