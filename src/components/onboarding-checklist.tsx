"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Package,
  Factory,
  TrendingUp,
  CheckCircle2,
  Circle,
  Rocket,
} from "lucide-react";

export function OnboardingChecklist() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Rocket className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Bienvenido a FBA Manager</h3>
          <p className="text-sm text-muted-foreground">Completá estos pasos para empezar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StepCard
          icon={Package}
          label="Agregar tu primer producto"
          href="/products"
          done={false}
        />
        <StepCard
          icon={Factory}
          label="Configurar un proveedor"
          href="/suppliers"
          done={false}
        />
        <StepCard
          icon={TrendingUp}
          label="Registrar tu primera venta"
          href="/sales"
          done={false}
        />
      </div>

      <div className="pt-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted-foreground">Progreso</span>
          <span className="text-xs font-medium text-cyan-400">0%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
          <div className="h-full w-0 bg-cyan-500 rounded-full transition-all duration-500" />
        </div>
      </div>
    </div>
  );
}

function StepCard({
  icon: Icon,
  label,
  href,
  done,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  done: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors group"
    >
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 shrink-0 transition-colors" />
      )}
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className={cn("text-sm", done ? "text-muted-foreground line-through" : "text-foreground")}>
          {label}
        </span>
      </div>
    </Link>
  );
}


