# AGENTS.md - Superpowers para Amazon FBA Manager

## Protocolo de Sesion (Segundo Cerebro)

Este proyecto usa un vault de Obsidian como memoria persistente entre sesiones. Todo agente debe seguir este protocolo:

### Al iniciar sesion

1. Leer `App State.md` — snapshot del proyecto (version, branch, build, features)
2. Leer `PROMPT_NEXT_SESSION.md` — checkpoint de la sesion anterior
3. Leer `Daily Notes/YYYY-MM-DD.md` (la mas reciente) — resumen de lo que se hizo
4. Leer `00 - Dashboard.md` — entry point del vault
5. Leer `Bugs Conocidos.md` — bugs activos

### Al finalizar sesion

1. Crear `Daily Notes/YYYY-MM-DD.md` con resumen estructurado:
   - Que se hizo (features, bugs, refactors, docs)
   - Decisiones tomadas
   - Archivos modificados
   - Pr�ximos pasos
2. Actualizar `PROMPT_NEXT_SESSION.md` con checkpoint actualizado
3. Actualizar `App State.md` con estado actual (version, branch, features en progreso)
4. Actualizar `Bugs Conocidos.md` si se encontraron/arreglaron bugs
5. Actualizar `Learning Log.md` si se descubrieron patrones o lecciones

### Formato de Daily Notes

```markdown
---
fecha: YYYY-MM-DD
tipo: daily-note
tags: [diario, desarrollo]
---

# YYYY-MM-DD - [titulo corto]

## Que se hizo
- [feature/bug/refactor/docs] descripcion

## Decisiones
- [que y por que]

## Archivos modificados
- ruta/al/archivo — motivo

## Proximos pasos
- [ ]

## Notas
```

## Metodologia

Este proyecto usa **Superpowers** para desarrollo de software. El agente debe seguir este flujo:

### 1. Brainstorming (antes de codear)
- Antes de escribir codigo, entender que queres realmente
- Hacer preguntas para clarificar requisitos
- Explorar alternativas
- Presentar el diseno por partes para validacion

### 2. Writing Plans (despues de aprobar diseno)
- Romper el trabajo en tareas chicas (2-5 min cada una)
- Cada tarea con: archivos exactos, codigo completo, pasos de verificacion
- Seguir TDD: test primero, despues codigo

### 3. Executing Plans (ejecucion)
- Ejecutar tareas en orden
- Verificar cada tarea antes de seguir
- Si algo falla, detenerse y arreglar

### 4. Code Review (entre tareas)
- Revisar contra el plan
- Reportar problemas por severidad
- Problemas criticos bloquean el progreso

### 5. Finishing (cuando termina)
- Verificar que todos los tests pasen
- Presentar opciones: merge, PR, keep, discard
- Limpiar worktree

## Comportamiento del Agente (SIEMPRE)

- **Skills/Superpowers siempre**: Antes de CUALQUIER accion, chequear si aplica una skill e invocarla. Brainstorming antes de crear features/modificar comportamiento; systematic-debugging ante cualquier bug o comportamiento inesperado; test-driven-development al implementar; verification-before-completion antes de declarar algo terminado/OK. Nunca racionalizar saltearlas ("es simple", "despues lo miro").
- **Orquestador de subagentes (SDD)**: El agente principal actua como cerebro orquestador de subagentes. Flujo por tarea: escribir brief en `.superpowers/sdd/briefs/task-N-brief.md` → despachar implementador (subagente `general`) → generar review package (`git diff -U2 BASE HEAD | Out-File .superpowers/sdd/review-packages/taskN.diff`) → despachar revisor (subagente) → registrar resultado en el ledger `.superpowers/sdd/progress.md`. NUNCA re-despachar tareas ya marcadas done en el ledger.
- **Skills faltantes → skills.sh**: Si falta una skill para la tarea actual, buscarla e instalarla con el CLI de skills.sh: `npx skills find <termino>` (buscar), `npx skills add <repo-o-package>` (instalar), `npx skills list` (ver instaladas). Las skills instaladas deben usarse igual que las de superpowers.

## Reglas del Proyecto

- **Idioma**: Siempre responder y comunicarse en **español**. Mensajes al usuario siempre en español.
- **Markdown**: Todo código, texto técnico y mensajes usar formato Markdown.
- **TypeScript strict**: Nunca usar `any`
- **CSS variables**: Siempre `bg-background`, nunca `bg-white`
- **snake_case** en DB/API, **camelCase** en frontend
- **Zod** para toda validacion
- **sonner** para toast, nunca alerts nativos
- **calculations.ts** es inmutable
- **Sin comentarios** en el codigo a menos que se pidan
- **Dividir el trabajo en fases**: Siempre dividir el trabajo en fases chicas (2-5 min cada una). Nunca encarar el trabajo completo de una sola vez.
- **Verificar cada fase**: Al terminar cada fase, correr la verificacion completa — `npx tsc --noEmit`, `npm run lint`, `npm run test:run`, `npm run build` — para asegurar que no haya bugs ni nada roto antes de seguir.
- **Seguridad > todo**: Nunca escribir API keys, tokens, secrets o passwords en archivos del repo (ni en codigo, ni en docs, ni en commit messages). Las keys van SOLO en `.env.local` (gitignored). Si un secreto se expone en chat o repo, rotarlo inmediatamente y avisar al usuario.
- **Nunca commitear sin verificar**: el pre-commit hook `scripts/check-secrets.js` bloquea commits con patrones de keys. No usar `--no-verify` salvo orden explicita.
- **No compartir secrets en el chat**: si el usuario pega una key en el chat, recordarle que quedo expuesta y debe rotarla.

## Comandos Utiles

```bash
npm run dev          # Desarrollo local
npm run build        # Build de produccion
npm run lint         # Linting
npm run typecheck    # Verificar tipos
```

## Estructura del Proyecto

```
src/
  app/(dashboard)/    # Paginas (Server Components)
  app/api/            # API routes
  components/         # Componentes React
  hooks/              # Custom hooks (useSWR)
  lib/                # Utilidades, validaciones, acciones server
  types/              # Tipos TypeScript
  validations/        # Schemas Zod
```

## Glosario

- `GLOSARIO.md` — referencia completa de términos y campos de la app (generado desde `src/lib/help-content.ts` con `npm run build:glossary`)
- Leer antes de trabajar: `GLOSARIO.md` (o su fuente `src/lib/help-content.ts`) para entender cada término, campo y métrica de la app
