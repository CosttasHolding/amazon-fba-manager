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

## Reglas del Proyecto

- **Idioma**: Siempre responder y comunicarse en **español**
- **TypeScript strict**: Nunca usar `any`
- **CSS variables**: Siempre `bg-background`, nunca `bg-white`
- **snake_case** en DB/API, **camelCase** en frontend
- **Zod** para toda validacion
- **sonner** para toast, nunca alerts nativos
- **calculations.ts** es inmutable
- **Sin comentarios** en el codigo a menos que se pidan

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
