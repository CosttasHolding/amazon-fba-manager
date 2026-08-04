# Research — Rediseño de vista (grilla por estado + drag & drop)

## Contexto

La pestaña Research tiene hoy dos vistas:
- **Kanban**: columnas por estado; cada columna crece en altura indefinida → listas kilométricas.
- **Lista**: tabla paginada.

El usuario reporta que **ambas le parecen feas**, maneja **100+ productos** y su flujo principal es **gestionar el pipeline + evaluar oportunidades**. Quiere detectar rápido potenciales (score/competencia/ROI) y no tener scroll infinito.

Decisión del usuario (brainstorm aprobado):
- Vista principal = **grilla por estado con drag & drop** (kanban 2.0).
- Tarjetas **compactas y densas**: score destacado + competencia con color + ROI/precio/ventas en una línea.
- Columnas con **altura acotada + scroll interno**.
- **Drag & drop** entre estados (además del select existente).
- **Filtros combinables**: búsqueda + estado + competencia + rango de score.
- Mantener toggle Kanban / Lista (la tabla queda igual).

## Diseño

### Tarjeta compacta

```
┌────────────────────────────┐
│ ⚡ Score: 78        [P1]    │  ← score destacado + prioridad
│ Estrella de Amazon          │  ← nombre (máx 2 líneas)
│ Yoga Mat 4mm               │  ← nicho
│ ─────────────────────────   │
│ Competencia: Muy baja  ★   │  ← badge con color por nivel
│ ROI 45% · $19.99 · 850/m    │  ← métricas en línea
│ ─────────────────────────   │
│ 12/08/2026          [☄️][↕] │  ← fecha + deep dive + drag handle
└────────────────────────────┘
```

- **Score**: grande arriba, color por rango (verde ≥70, ámbar 40-69, rojo <40).
- **Competencia**: badge con color según nivel (muy baja = verde → muy alta = rojo).
- **Métricas**: una línea compacta ROI · precio · ventas/m.
- **Drag handle** (ícono `GripVertical`) para arrastrar; click en la card sigue abriendo edición.
- Estética: `rounded-xl`, fondo card, hover con sombra (misma línea que la app).

### Columnas y drag & drop

- Header con estado + contador; **`max-h` + `overflow-y-auto`** (scroll interno), ya no crece infinito.
- Ancho ~240px (más angosto que hoy) para que entren más columnas.
- Drag & drop con **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`):
  - Agarrar por manija o mantener.
  - Columna destino resaltada.
  - Al soltar: se mueve el estado y guarda vía `PUT /api/research` (mismo endpoint que el select).
  - Feedback: card semitransparente al arrastrar; toast éxito/error (patrón existente).

### Filtros combinables

- **Búsqueda** (existe): nombre, nicho, ASIN.
- **Estado** (existe): dropdown todos los estados.
- **Competencia** (nuevo): dropdown 5 niveles.
- **Rango de score** (nuevo): Todos / Top ≥70 / Medio 40-69 / Bajo <40.
- Todo combinable.

## Definiciones y reglas

- **Snake_case DB / camelCase front**: no aplica (solo UI).
- **TypeScript strict**: nunca `any`.
- **Zod** para validación de entrada (sin cambios — solo UI).
- **i18n**: agregar keys `research.filter.*` y `research.score_rank.*` en es/en/ar.
- **sin comentarios** en el código.
- Se agregan dependencias: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- No se tocan `scoring.ts` / `calculations.ts` / lógica de negocio.

## Archivos

- `src/app/(dashboard)/research/page.tsx` — rediseño kanban + filtros + drag & drop.
- `src/lib/i18n/{es,en,ar}.json` — keys de filtros.
- `package.json` — deps dnd-kit.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → solo warnings pre-existentes.
- `npm run test:run` → todos PASS.
- `npm run build` → OK.

## Fuera de scope

- No se toca el modal de edición ni el deep dive.
- La vista Lista se conserva sin cambios en esta entrega.
- No hay optimización de performance de queries (follow-up separado).