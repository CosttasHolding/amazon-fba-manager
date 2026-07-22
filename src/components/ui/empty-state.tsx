import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center animate-fade-up", className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/70" />
      </div>
      <h3 className="text-lg font-semibold text-foreground/70 mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{subtitle}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
