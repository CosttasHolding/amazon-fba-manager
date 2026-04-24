"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// ScrollArea component not available, using div with overflow
import { cn } from "@/lib/utils";
import { HELP_SECTIONS, HELP_GLOSSARY, getSectionIdFromPath, type HelpSection } from "@/lib/help-content";
import { BookOpen, ChevronRight, Lightbulb, Calculator, Table, Filter, MousePointer, HelpCircle } from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-select section based on current route when modal opens
  useEffect(() => {
    if (open && pathname) {
      const sectionId = getSectionIdFromPath(pathname);
      setActiveSection(sectionId);
      // Scroll to section after a short delay to allow render
      setTimeout(() => {
        const el = document.getElementById(`help-section-${sectionId}`);
        if (el && contentRef.current) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [open, pathname]);

  const currentSection = HELP_SECTIONS.find((s) => s.id === activeSection) || HELP_SECTIONS[0];

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setTimeout(() => {
      const el = document.getElementById(`help-section-${sectionId}`);
      if (el && contentRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2.5 text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Centro de Ayuda / Auditoría de Uso
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(85vh-65px)]">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secciones</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-0.5">
                {HELP_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(section.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        activeSection === section.id ? "rotate-90" : ""
                      )}
                    />
                    {section.title}
                  </button>
                ))}

                <div className="pt-2 mt-2 border-t border-border">
                  <button
                    onClick={() => handleSectionClick("glossary")}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left",
                      activeSection === "glossary"
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Glosario Técnico
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto" ref={contentRef}>
            <div className="p-6 space-y-8">
              {activeSection === "glossary" ? (
                <GlossaryContent />
              ) : (
                <SectionContent section={currentSection} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionContent({ section }: { section: HelpSection }) {
  return (
    <div id={`help-section-${section.id}`} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground font-display">{section.title}</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{section.description}</p>
      </div>

      {/* KPIs */}
      {section.kpis && section.kpis.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <Calculator className="h-4 w-4 text-primary" />
            KPIs y Métricas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.kpis.map((kpi, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border">
                <p className="font-medium text-sm text-foreground">{kpi.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                {kpi.formula && (
                  <p className="text-xs font-mono text-primary mt-2 bg-primary/5 rounded px-2 py-1">
                    {kpi.formula}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {section.filters && section.filters.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary" />
            Filtros y Búsqueda
          </h3>
          <div className="space-y-2">
            {section.filters.map((filter, i) => (
              <div key={i} className="flex items-start gap-3 bg-muted/50 rounded-xl p-3 border border-border">
                <span className="text-sm font-medium text-foreground min-w-[120px]">{filter.label}</span>
                <span className="text-sm text-muted-foreground">{filter.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      {section.tables && section.tables.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <Table className="h-4 w-4 text-primary" />
            Tablas y Listas
          </h3>
          {section.tables.map((table, i) => (
            <div key={i} className="bg-muted/50 rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/80">
                <p className="text-sm font-medium text-foreground">{table.label}</p>
              </div>
              <div className="divide-y divide-border/50">
                {table.columns.map((col, j) => (
                  <div key={j} className="px-4 py-2.5 flex items-start gap-3">
                    <span className="text-sm font-medium text-primary min-w-[140px]">{col.name}</span>
                    <span className="text-sm text-muted-foreground">{col.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forms */}
      {section.forms && section.forms.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <MousePointer className="h-4 w-4 text-primary" />
            Formularios
          </h3>
          {section.forms.map((form, i) => (
            <div key={i} className="bg-muted/50 rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/80">
                <p className="text-sm font-medium text-foreground">{form.label}</p>
              </div>
              <div className="divide-y divide-border/50">
                {form.fields.map((field, j) => (
                  <div key={j} className="px-4 py-2.5 flex items-start gap-3">
                    <span className="text-sm font-medium text-primary min-w-[180px]">
                      {field.name}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </span>
                    <span className="text-sm text-muted-foreground">{field.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {section.actions && section.actions.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <MousePointer className="h-4 w-4 text-primary" />
            Acciones Disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.actions.map((action, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border">
                <p className="font-medium text-sm text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Glossary */}
      {section.glossary && section.glossary.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <HelpCircle className="h-4 w-4 text-primary" />
            Términos Específicos
          </h3>
          <div className="space-y-2">
            {section.glossary.map((item, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border">
                <p className="font-medium text-sm text-primary">{item.term}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {section.tips && section.tips.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Tips y Buenas Prácticas
          </h3>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
            {section.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-500 text-xs mt-0.5">▸</span>
                <p className="text-sm text-foreground/80">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GlossaryContent() {
  return (
    <div id="help-section-glossary" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground font-display">Glosario Técnico</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Definiciones técnicas de términos utilizados en la plataforma Amazon FBA Manager.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {HELP_GLOSSARY.map((item, i) => (
          <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border">
            <p className="font-medium text-sm text-primary">{item.term}</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
