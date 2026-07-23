# AGENTS.md - Superpowers para Amazon FBA Manager

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
