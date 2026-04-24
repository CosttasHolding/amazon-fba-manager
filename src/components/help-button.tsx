"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { HelpModal } from "./help-modal";
import { cn } from "@/lib/utils";

interface HelpButtonProps {
  className?: string;
}

export function HelpButton({ className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full lg:bottom-8 lg:right-8",
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
          "hover:bg-primary/90 hover:scale-105 active:scale-95",
          "transition-all duration-200 group",
          className
        )}
        aria-label="Abrir centro de ayuda"
        title="Centro de Ayuda"
      >
        <HelpCircle className="h-5 w-5" />
        
        {/* Tooltip */}
        <span className="absolute right-14 bg-card border border-border text-foreground text-xs px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Centro de Ayuda
        </span>
      </button>

      <HelpModal open={open} onOpenChange={setOpen} />
    </>
  );
}
