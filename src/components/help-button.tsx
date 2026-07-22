"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { HelpModal } from "./help-modal";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface HelpButtonProps {
  className?: string;
}

export function HelpButton({ className }: HelpButtonProps) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-50 flex items-center justify-center w-11 h-11 rounded-full",
          "bottom-20 end-4 md:bottom-8 md:end-8",
          "bg-primary text-primary-foreground shadow-xl shadow-primary/30",
          "hover:bg-primary/90 hover:scale-110 active:scale-95",
          "transition-all duration-300 group",
          className
        )}
        aria-label={t("help.open", locale)}
        title={t("help.title", locale)}
      >
        <HelpCircle className="h-5 w-5" />
        
        {/* Tooltip */}
        <span className="absolute end-12 bg-card border border-border text-foreground text-xs px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {t("help.title", locale)}
        </span>
      </button>

      <HelpModal open={open} onOpenChange={setOpen} />
    </>
  );
}
