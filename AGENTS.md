# AGENTS.md — Amazon FBA Manager

## Identidad

SaaS multi-tenant para gestión de Amazon FBA. Next.js 14 (App Router) + Supabase (RLS) + TypeScript strict + Tailwind/shadcn + Vitest + Playwright. Idioma del agente: **español**.

Estructura: `src/app/(dashboard)/` páginas · `src/app/api/` routes · `src/components/` · `src/hooks/` · `src/lib/` · `src/types/` · `src/validations/`.

## Invariantes absolutas

1. **Multi-tenant**: toda query, mutation, API route o código server-side debe estar scoped por `org_id` con autenticación y membership verificadas. Service role NO está protegido por RLS: si el código usa service role, la autorización es responsabilidad del código.
2. **Código financiero crítico**: `src/lib/calculations.ts`, `src/lib/dashboard/metrics.ts`, `src/lib/research/scoring.ts`, `src/lib/research/recompute.ts`. Cambios solo con motivo explícito, regression test con valores esperados y review independiente.
3. **Secrets**: SOLO en `.env.local` (gitignored). Nunca en código, docs ni commits. Pre-commit `scripts/check-secrets.js`; jamás `--no-verify`. Si un secreto se expone en chat o repo: rotarlo inmediatamente y avisar.
4. **Producción**: no modificar datos, RLS, credenciales ni configuración productiva irreversible sin aprobación explícita.

## Convenciones de código

Fuente única: **CONVENTIONS.md** (TS strict sin `any`, Zod para validación, sonner para toasts, `bg-background` nunca `bg-white`, snake_case en DB/API / camelCase en frontend, sin comentarios). Términos y métricas de la app: `GLOSARIO.md`.

## Carga de contexto (lazy)

No leer documentación completa al iniciar sesión. Cargar solo lo relevante al dominio de la tarea:

| Dominio | Documentos |
|---|---|
| UI | `DESIGN_SYSTEM.md`, `UI-PATTERNS.md` |
| DB | `DATABASE.md` + `supabase/migrations/` |
| API | `API.md` |
| Módulos/features | `MODULES.md` |
| Arquitectura | `ARCHITECTURE.md` |
| Decisiones pasadas | `Decisiones Tecnicas.md`, `docs/superpowers/specs/` |

Git, código, tests y configs son la fuente de verdad sobre branch, versión, cantidad de tests y estado. Handoff entre sesiones: leer únicamente la Daily Note más reciente si contiene contexto activo; al cerrar sesión escribir una Daily Note mínima (pendientes críticos, decisiones, próximo paso) — nunca información derivable de git.

## Clasificación y verificación proporcional

Clasificar cada tarea antes de ejecutarla. El proceso escala con el riesgo, no con el tamaño:

- **SIMPLE** (copy, estilos, iconos): cambio directo → typecheck/lint targeted.
- **STANDARD** (componente, hook, endpoint): plan corto → implementar → tests relacionados → revisar diff.
- **COMPLEX** (feature multi-módulo, integración): exploración → spec breve → plan en fases verificables → implementar → review.
- **CRITICAL** (RLS, org_id, auth, service role, migraciones destructivas, cálculos financieros, seguridad tenant): análisis de impacto → plan explícito → aprobación del usuario → implementación con regression/security tests → review independiente → verificación completa.

Checklist tenant antes de tocar DB/API/server: autenticación ✓ organización ✓ membership ✓ rol ✓ `org_id` ✓ impacto RLS ✓ bypass service-role ✓ fuga cross-tenant ✓.

Verificación completa (`npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build`) solo pre-commit/pre-merge o tras cambios COMPLEX/CRITICAL. Nunca declarar algo terminado sin evidencia del check correspondiente; usar UNVERIFIED si falta probar.

## Acciones que requieren aprobación explícita

push / force-push / merge / borrar branches remotas · migraciones destructivas o cambios de RLS en producción · borrado masivo de documentación · major upgrade de dependencias · cambio financiero con comportamiento esperado ambiguo · cualquier acción irreversible. Commits locales permitidos con working tree controlado y pre-commit en verde.

## Superpowers y subagentes

Superpowers es **toolbox**, no ceremony obligatoria: systematic-debugging ante bugs difíciles, verification-before-completion antes de declarar terminado, planning para COMPLEX/CRITICAL. Subagentes solo cuando aporten valor real (exploración read-only, revisión independiente, verificación de áreas críticas), nunca por costumbre.

## Comandos

```bash
npm run dev          # Desarrollo local
npm run typecheck    # Verificación de tipos
npm run lint         # Linting
npm run test:run     # Tests unitarios
npm run build        # Build de producción
npm run e2e          # Playwright E2E
```
