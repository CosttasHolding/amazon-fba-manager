# AI System Audit

Fecha: 2026-08-22 | Branch: `main` @ 5e23457 | Método: subagentes read-only (`explorer`, `docs-auditor`) + baseline dinámico verificado.

## Baseline verificado

| Check | Resultado |
|---|---|
| Node / npm (host) | v24.19.0 / 12.0.2 |
| TypeScript 5.9.3 strict | PASS (0 errores) |
| ESLint 8.57.1 + eslint-config-next **14.1.0** vs next **14.2.35** | PASS, 14 warnings pre-existentes (12 `<img>`, 2 exhaustive-deps) |
| Vitest 4.1.4 | PASS — 47 archivos, 391 tests |
| Build producción Next 14.2.35 | PASS — 41 rutas estáticas, ~110 rutas totales |
| CI | NO EXISTE |
| engines / .nvmrc | NO EXISTEN |

## Hallazgos confirmados (HEAD)

### F1 — Lectura obligatoria de 5 documentos al iniciar sesión
- Evidence: `AGENTS.md` §"Protocolo de Sesión" (App State, PROMPT_NEXT_SESSION, Daily Notes, Dashboard, Bugs Conocidos)
- Impact: ~2-4k tokens de contexto quemados antes de tocar código; la mayoría es derivable de git/código.
- Risk: Medio. Información stale contamina decisiones.
- Recommendation: lazy-loading por dominio; Daily Note solo como handoff con contexto activo.
- Action: **FIXED en AGENTS v2**.

### F2 — Regla artificial "Max 2 archivos por respuesta"
- Evidence: `CONVENTIONS.md:9`, `PROMPT_MAESTRO_FBA_MANAGER.md:27`
- Impact: fragmenta trabajo coherente; contradice scope discipline real.
- Risk: Bajo. Ya no estaba en AGENTS.md (divergencia entre docs).
- Recommendation: eliminar; reemplazar por "conjunto mínimo de archivos necesario".
- Action: **FIXED en CONVENTIONS.md**.

### F3 — Superpowers/TDD obligatorios para toda tarea
- Evidence: `AGENTS.md` §"Comportamiento del Agente": skills siempre, nunca racionalizar saltearlas.
- Impact: ceremony desproporcionada para cambios SIMPLE (copy, estilo).
- Risk: Medio. Consume tokens y tiempo sin proporcionalidad al riesgo.
- Recommendation: toolbox, no ceremony. Escalar proceso con riesgo (ver workflow routing).
- Action: **FIXED en AGENTS v2**.

### F4 — Verificación completa tras cada microfase de 2-5 min
- Evidence: `AGENTS.md` §"Reglas del Proyecto": tsc + lint + test:run + build por cada fase.
- Risk: Alto para eficiencia; build completo cuesta minutos por microcambio.
- Recommendation: verificación proporcional al riesgo (UI → targeted; pre-merge → full).
- Action: **FIXED en AGENTS v2**.

### F5 — Subagentes SDD obligatorios para toda tarea
- Evidence: `AGENTS.md` §"Orquestador de subagentes (SDD)": brief → implementador → review package → revisor → ledger "por tarea".
- Impact: overhead masivo para tareas STANDARD/SIMPLE.
- Risk: Medio.
- Recommendation: subagentes proporcionales (COMPLEX/CRITICAL únicamente).
- Action: **FIXED en AGENTS v2**.

### F6 — Referencias a CLAUDE.md inexistente
- Evidence: `PROMPT_MAESTRO_FBA_MANAGER.md:4,55`, `docs/ACTION_PLAN.md:16-17,197,258`, `docs/SUMMARY_2026-07-06.md:28`
- Impact: confusión de agentes portables.
- Risk: Bajo.
- Action: **FIXED** — prompt obsoleto archivado en `docs/archive/`; ACTION_PLAN/SUMMARY son históricos fechados (aceptable como log).

### F7 — Test count stale en ARCHITECTURE
- Evidence: `ARCHITECTURE.md:655` "(Vitest 168 tests)" como vigente. Realidad: 47 archivos / 391 tests.
- Risk: Medio — los agentes desconfían o copian cifras falsas.
- Recommendation: no citar conteos exactos en docs permanentes; referenciar comando.
- Action: **FIXED en ARCHITECTURE.md**.

### F8 — DATABASE.md inconsistente consigo mismo
- Evidence: header declara "29 tablas + 21 migraciones"; su propio índice lista 40 tablas; hay 30 archivos de migración.
- Risk: Alto para trabajo de DB (conteo incorrecto = confianza rota).
- Action: **FIXED en DATABASE.md**.

### F9 — Duplicación de reglas AGENTS ↔ CONVENTIONS ↔ ARCHITECTURE
- Evidence: no-any, snake_case/camelCase, bg-white→bg-background, calculations.ts immutable, Zod, sonner repetidas en ≥2 docs. Ya divergieron (F2).
- Risk: Alto a largo plazo — divergencia silenciosa.
- Recommendation: una sola fuente de verdad: convenciones de código viven SOLO en CONVENTIONS.md; AGENTS apunta.
- Action: **FIXED** — dedupe realizado.

### F10 — Lógica financiera crítica fuera del perímetro protegido
- Evidence: regla "calculations.ts inmutable" cubre solo `src/lib/calculations.ts` (3 líneas minificadas: calcRefFee/calcFBAFee/calcMetrics). Lógica financiera equivalente SIN protección en `src/lib/dashboard/metrics.ts` y `src/lib/research/{scoring,recompute}.ts`.
- Impact: un agente puede alterar métricas financieras sin regression tests obligatorios.
- Risk: Alto (dominio financiero).
- Recommendation: ampliar definición a "código financiero crítico" por contenido, no por archivo.
- Action: **FIXED en AGENTS v2** (definición por dominio).

### F11 — Documentación subestima requisito de Node
- Evidence: `README.md:62`, `docs/ACTION_PLAN.md:381` dicen "Node 18+". Vitest 4 exige `^20.19 || >=22.12`. Sin `engines` ni `.nvmrc`.
- Risk: Medio (onboarding roto en Node 18).
- Action: **FIXED** — README corregido + `engines.node >=20.19` en package.json + `.nvmrc` (24.19.0).

### F12 — Script `typecheck` referenciado pero inexistente
- Evidence: AGENTS.md manda correr `npm run typecheck`; package.json no lo define.
- Risk: Bajo-Medio (comandos que fallan erosionan automatización).
- Action: **FIXED** — script agregado a package.json y verificado (`npm run typecheck` exit 0).

## Compatibilidad toolchain (FASE 7)

| Paquete | Antes | Después |
|---|---|---|
| eslint-config-next | 14.1.0 (desalineado con next 14.2.35) | **14.2.35** (alineado, misma major) |
| adm-zip + @types/adm-zip | presentes, cero imports | **REMOVIDAS** (uso histórico extension build; hoy usa esbuild) |
| tw-animate-css | presente, cero refs | **REMOVIDA** (`tailwind.config.ts` usa tailwindcss-animate) |
| web-push + @types/web-push | presentes, cero imports | **REMOVIDAS** (rutas push solo persisten suscripciones; re-agregar al implementar envío) |
| engines / .nvmrc | inexistentes | **AGREGADOS** |

Verificación post-cambio: tsc 0 · lint sin errores nuevos · 391/391 tests · build OK · lockfile regenerado por npm.

Notas: NO se ejecutó `npm audit fix` (cambiaría dependencias incidentalmente). Vulnerabilidades pre-existentes: 17 (3 moderate, 14 high) — pendiente revisión dedicada fuera de esta misión. Sin CI existente; crear workflows queda como propuesta (ver reporte final).

## Hipótesis refutadas (no aplicar fixes)

| Hipótesis | Realidad |
|---|---|
| calculations.ts apunta al archivo equivocado | Refutado: es el archivo correcto (minificado), consumido por `/api/calculator/route.ts:5` |
| Conteo "47 archivos test" inventado | Exacto: 42 `.test.ts` + 5 `.test.tsx` |
| Links rotos desde AGENTS/Dashboard | Ninguno encontrado; todas las rutas citadas existen |

## Matriz de documentos

| File | Purpose | Authority | Freshness | Acción |
|---|---|---|---|---|
| README.md | Entry point humano | Alta | OK | KEEP (+fix Node) |
| AGENTS.md | Comportamiento IA | Alta | Stale | REWRITTEN v2 |
| CONVENTIONS.md | Convenciones código | Alta | Parcial | FIXED (fuente única) |
| ARCHITECTURE.md | Arquitectura | Alta | Parcial | FIXED (test count) |
| DATABASE.md | Schema DB | Alta | Inconsistente | FIXED (conteos) |
| API.md / MODULES.md / UI-PATTERNS.md | Referencia técnica | Alta | OK | KEEP |
| DESIGN_SYSTEM.md | UI | Media | Solapa UI-PATTERNS | KEEP (merge futuro si toca UI) |
| GLOSARIO.md | Glosario generado | Generado | OK | KEEP (regenerable) |
| App State.md | Contexto activo | Media | Hoy | PODADO (métricas derivables fuera) |
| PROMPT_NEXT_SESSION.md | Handoff | Media | Historial pesado | PODADO (cerradas → archive) |
| CHANGELOG.md / Bugs Conocidos / Learning Log / Decisiones Tecnicas | Histórico vivo | Media | OK | KEEP |
| 00-03 Index/Dashboard | MOCs vault | Media | OK | KEEP |
| PLAN_VAULT.md | Plan ejecutado | Nula | Obsoleto | ARCHIVED |
| CHANGELOG-UI-OPTIMIZATION.md | Changelog feature | Nula | Histórico | MERGED → CHANGELOG.md, archivado |
| PROMPT_MAESTRO_FBA_MANAGER.md | Prompt obsoleto (cita CLAUDE.md) | Nula | Obsoleto | ARCHIVED |
| Prompt Maestro — Auditoría….md | Esta misión | Nula | One-shot | ARCHIVED al finalizar |
| docs/superpowers/** | Plans/specs históricos | Media | Histórico | KEEP como está |
| docs/ACTION_PLAN.md, SUMMARY_2026-07-06.md | Histórico fechado | Baja | Archivo | KEEP (log), no operativo |

## Riesgos nuevos detectados

### R1 🔴 MCP conectado a PRODUCCIÓN
- `opencode.json` → `mcp.fba-manager` → `https://amazon-fba-manager-virid.vercel.app/api/mcp`
- Un agente local puede leer/mutar datos reales vía tools MCP sin salvaguarda explícita.
- Decisión del owner (2026-08-22): dejarlo y documentar. Cualquier mutación vía MCP debe tratarse como operación sobre producción.

### R2 🟡 Token Vercel histórico — RESUELTO
- Incidente documentado en `docs/ACTION_PLAN.md:16-17`. Owner confirma rotación realizada (2026-08-22).

### R3 🟡 Datos personales versionados
- `PROMPT_NEXT_SESSION.md` contenía rutas personales (`C:\Users\Nacho\…`). Podado; evitar reintroducirlas.

### R4 🟡 Sin CI ni engines
- Verificación manual-only; reproducibilidad depende del host local. Pendiente FASE 7+.
