import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HELP_GLOSSARY,
  HELP_SECTIONS,
  type HelpSection,
} from "../lib/help-content";

const OUTPUT_PATH = resolve(process.cwd(), "GLOSARIO.md");

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escapedHeaders = headers.map(escapeCell);
  const headerRow = `| ${escapedHeaders.join(" | ")} |`;
  const separator = `| ${escapedHeaders.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`);
  return [headerRow, separator, ...body].join("\n");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function glossaryTable(terms: { term: string; definition: string }[]): string {
  return markdownTable(
    ["Término", "Definición"],
    terms.map((term) => [term.term, term.definition])
  );
}

function renderSection(section: HelpSection): string {
  const lines: string[] = [];

  lines.push(`## ${section.id} — ${section.title}`);
  lines.push("");
  lines.push(`Ruta: [${section.route}](${section.route})`);
  lines.push("");
  lines.push("### Descripción");
  lines.push("");
  lines.push(section.description);
  lines.push("");

  if (section.kpis && section.kpis.length > 0) {
    lines.push("### KPIs");
    lines.push("");
    lines.push(
      markdownTable(
        ["KPI", "Descripción", "Fórmula"],
        section.kpis.map((kpi) => [kpi.label, kpi.description, kpi.formula ?? ""])
      )
    );
    lines.push("");
  }

  if (section.filters && section.filters.length > 0) {
    lines.push("### Filtros");
    lines.push("");
    lines.push(
      markdownTable(
        ["Filtro", "Descripción"],
        section.filters.map((filter) => [filter.label, filter.description])
      )
    );
    lines.push("");
  }

  if (section.actions && section.actions.length > 0) {
    lines.push("### Acciones");
    lines.push("");
    lines.push(
      markdownTable(
        ["Acción", "Descripción"],
        section.actions.map((action) => [action.label, action.description])
      )
    );
    lines.push("");
  }

  if (section.tables && section.tables.length > 0) {
    lines.push("### Tablas");
    lines.push("");
    section.tables.forEach((table) => {
      lines.push(`#### ${table.label}`);
      lines.push("");
      lines.push(
        markdownTable(
          ["Columna", "Descripción"],
          table.columns.map((column) => [column.name, column.description])
        )
      );
      lines.push("");
    });
  }

  if (section.forms && section.forms.length > 0) {
    lines.push("### Formularios");
    lines.push("");
    section.forms.forEach((form) => {
      lines.push(`#### ${form.label}`);
      lines.push("");
      lines.push(
        markdownTable(
          ["Campo", "Descripción", "Requerido"],
          form.fields.map((field) => [
            field.name,
            field.description,
            field.required ? "Sí" : "No",
          ])
        )
      );
      lines.push("");
    });
  }

  if (section.glossary && section.glossary.length > 0) {
    lines.push("### Glosario de sección");
    lines.push("");
    lines.push(glossaryTable(section.glossary));
    lines.push("");
  }

  if (section.tips && section.tips.length > 0) {
    lines.push("### Tips");
    lines.push("");
    section.tips.forEach((tip) => lines.push(`- ${tip}`));
    lines.push("");
  }

  return lines.join("\n");
}

function buildGlossary(): string {
  const lines: string[] = [];

  lines.push("# GLOSARIO");
  lines.push("");
  lines.push(
    "Referencia completa de la app **Amazon FBA Manager**. Este documento se genera automáticamente desde `src/lib/help-content.ts`."
  );
  lines.push("");
  lines.push("Para regenerarlo, ejecutá:");
  lines.push("");
  lines.push("```bash");
  lines.push("npm run build:glossary");
  lines.push("```");
  lines.push("");
  lines.push("## Contenido");
  lines.push("");
  lines.push(`- [Términos Globales](#${slugify("Términos Globales")})`);
  HELP_SECTIONS.forEach((section) => {
    const heading = `${section.id} — ${section.title}`;
    lines.push(`- [${heading}](#${slugify(heading)})`);
  });
  lines.push("");
  lines.push("## Términos Globales");
  lines.push("");
  lines.push(glossaryTable(HELP_GLOSSARY));
  lines.push("");

  HELP_SECTIONS.forEach((section) => {
    lines.push(renderSection(section));
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const content = buildGlossary();
writeFileSync(OUTPUT_PATH, content, "utf8");
console.log(
  `GLOSARIO.md generado en ${OUTPUT_PATH}: ${HELP_GLOSSARY.length} términos globales, ${HELP_SECTIONS.length} secciones.`
);
process.exit(0);
