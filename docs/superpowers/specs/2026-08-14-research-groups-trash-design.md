# Research — Grupos por Item + Papelera global

## Contexto

La pestaña Research hoy es un pipeline de productos sueltos (kanban + lista). El usuario captura productos desde la extensión (búsqueda o página de producto de Amazon) y cada captura entra como una idea sin relación con las demás. Su objetivo: **elegir y descartar el mejor producto de un mismo item**, comparando competidores del mismo producto (mismo ASIN o mismo item genérico capturado en distintos momentos).

Además, quiere un sistema de **papelera para toda la app** (soft delete) para no perder datos al borrar por accidente, con borrado definitivo con doble confirmación.

Decisión del usuario (brainstorm aprobado):
- **Enfoque A — Grupos reales**: tabla nueva `research_groups` + agrupación con IA (con fallback heurístico).
- **Papelera**: solo entidades gestionables (~21 tablas), papelera global única en navbar + patrón en cada sección.
- **Borrado en cascada**: al borrar definitivamente un grupo, se borran en cascada sus productos. Al soft-deletear un grupo, sus productos van juntos a la papelera; restaurar restaura ambos.

## Diseño

### Modelo de datos

**Tabla nueva `research_groups`** (migración `034_research_groups.sql`):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | gen_random_uuid() |
| `org_id` | UUID FK → organizations | multi-tenant, ON DELETE CASCADE |
| `name` | TEXT NOT NULL | nombre canónico del item |
| `niche` | TEXT | subnicho |
| `amazon_category` | TEXT | categoría de Amazon |
| `search_keyword` | TEXT | keyword desde la que se creó |
| `deleted_at` | TIMESTAMPTZ null | soft delete / papelera |
| `created_at` / `updated_at` | TIMESTAMPTZ | trigger updated |

**`product_research`** (misma migración):
- `group_id UUID REFERENCES research_groups(id) ON DELETE CASCADE` (nullable).
- `deleted_at TIMESTAMPTZ null` (soft delete).

**Migración `035_soft_delete.sql`**: `deleted_at TIMESTAMPTZ NULL` en las ~21 tablas gestionables + índices compuestos `(org_id, deleted_at)` donde tenga org_id.

Tablas gestionables (entran a papelera):
`products`, `inventory`, `suppliers`, `product_suppliers`, `supplier_quotes`, `purchase_orders`, `fba_shipments`, `fba_shipment_items`, `returns`, `reimbursements`, `expenses`, `amazon_payouts`, `ppc_campaigns`, `ppc_daily_metrics`, `tasks`, `members`, `company_members`, `board_decisions`, `reorder_rules`, `alert_rules`, `scheduled_reports`, `product_research`, `research_groups`.

Tablas transaccionales (sin papelera): `sales`, `stock_movements`, `sync_logs`, `audit_log`, `notifications`, `rate_limits`, `comments`, `shared_links`, `sp_api_*`, `push_subscriptions`, `org_members`, `org_invitations`, `succession_events`.

### Comportamiento de la papelera

- **Eliminar grupo o competidor** → se setea `deleted_at` (soft delete). Si es un grupo, sus productos (`group_id = grupo`) también reciben `deleted_at` en la misma operación.
- **Restaurar** → `deleted_at = null` (grupo y sus productos).
- **Borrado definitivo** → solo desde la papelera, con 2ª confirmación. Grupo → DELETE real con cascada de productos.

### Flujo de agrupación (capture)

En `POST /api/research/capture`, luego del scoring:

1. **Clasificar con IA** (`src/lib/research/grouping.ts` → `classifyToGroup`): envía producto capturado (título, ASIN, nicho, categoría, keyword) a Grok; responde JSON `{ group_name, niche, amazon_category, match: "existing" | "new", group_id? }`.
2. **Agrupar**: `match=existing` → asigna `group_id` (el producto entra como competidor). `match=new` → crea grupo y lo asigna.
3. **Fallback sin IA** (crítico, si Grok 403/timeout): heurística pura local:
   - Grupo que contenga un producto con **mismo ASIN ignorando case** → ese grupo.
   - Si no: match por **mismo nicho + nombre normalizado** (minus, sin acentos, tokens sin stopwords) → primer grupo con superposición ≥ 1 token clave.
   - Si no: crear grupo con nombre = título del producto (truncado a 120 chars) + nicho.
4. **Enriquecer/corregir con IA** (solo si responde): completa campos faltantes (categoría, nicho, estimados, diferenciación) sin pisar los que ya vienen capturados.

El fallback es la ruta por defecto hasta que el team xAI tenga créditos.

### API

| Endpoint | Método | Qué hace |
|---|---|---|
| `/api/research/groups` | GET | Lista grupos (sin borrados) con sus competidores + métricas + "mejor competidor" |
| `/api/research/groups` | POST | Crear grupo manual |
| `/api/research/groups?id=` | PUT | Actualizar nombre/nicho/categoría/keyword |
| `/api/research/groups?id=` | DELETE | Soft delete del grupo + sus productos |
| `/api/research/groups/restore?id=` | POST | Restaurar grupo + productos |
| `/api/research/groups?id=&permanent=true` | DELETE | Borrado definitivo en cascada |
| `POST /api/research/{id}/group` | POST | Mover competidor a otro grupo (body `{ group_id }`) |
| `/api/trash?entity=&q=` | GET | Listar borrados por sección |
| `/api/trash/restore` | POST | Restaurar fila (body `{ entity, id }`) |
| `/api/trash` | DELETE | Borrado definitivo (body `{ entity, id }`) |

Todas las rutas respetan multi-tenant (`org_id`) y RLS.

### Helper puro `src/lib/trash.ts`

- `TRASH_ENTITIES`: mapa entity → tabla SQL (solo gestionables).
- `softDeleteEntity(supabase, entity, orgId, ids, cascadeGroup?)` → setea `deleted_at`; si es `research_groups`, también sus productos.
- `restoreEntity(supabase, entity, orgId, ids)` → `deleted_at = null`; si es grupo, restaura productos.
- `permanentDeleteEntity(...)` → `DELETE` real; si grupo, cascada.

### UI — vista "Grupos" en `/research`

- Conmutador Kanban / Lista / **Grupos** (nuevo, principal).
- **Filtros + orden combinables**: búsqueda (nombre/nicho/ASIN), estado, competencia, rango de score, orden por (score desc, ventas desc, revenue desc, ROI desc, competencia asc, fecha desc).
- **Tarjeta de grupo**: nombre del item, nicho, `#competidores`, mejor score (color por rango), competencia del item (menor nivel entre competidores). Click → expande/va a detalle en el mismo panel.
- **Competidores dentro del grupo** (tabla/cards comparables): imagen, ASIN, fuente, score, ventas/m, revenue/m, precio, margen, sellers FBA, BSR, competencia, fecha. Acciones rápidas: **✓ Elegir** (status→approved), **✗ Descartar** (→rejected), DeepDive, Editar, Mover a otro grupo.
- **Bucket "Sin grupo"**: competidores `group_id IS NULL`; botón "Re-clasificar" (re-ejecuta IA/fallback) o mover manual.
- i18n es/en/ar + glosario (research group terms).

### UI — Papelera global `/trash`

- Página con selector de sección (entity), lista de borrados, Restaurar / Borrar definitivo (2ª confirmación, campo de texto "BORRAR").
- Acceso desde navbar (ícono Trash2) y desde Research (botón papelera de grupos).

## Definiciones y reglas

- **Snake_case DB / camelCase front**: IDs de grupo en frontend `groupId`/`group_id`.
- **TypeScript strict**: nunca `any`.
- **Zod** para toda validación de entrada en rutas nuevas.
- **sonner** para toasts, nunca alerts nativos.
- **Sin comentarios** en código.
- **`scoring.ts` / `calculations.ts` / `competition.ts` inmutables** — los helpers nuevos solo consumen.
- **`src/lib/research/grouping.ts` y `src/lib/trash.ts`puros** (sin imports de la app), testeables con vitest.
- **i18n**: keys nuevas en es/en/ar.
- No se modifican migraciones aplicadas en prod.

## Archivos

- `supabase/migrations/034_research_groups.sql` — grupos + group_id + deleted_at.
- `supabase/migrations/035_soft_delete.sql` — deleted_at en gestionables + índices.
- `src/lib/research/grouping.ts` + `grouping.test.ts` — clasificación IA + fallback.
- `src/lib/trash.ts` + `trash.test.ts` — entidades y operaciones papelera.
- `src/app/api/research/groups/route.ts` + `[id]/route.ts` — CRUD grupos.
- `src/app/api/research/groups/restore/route.ts` — restaurar.
- `src/app/api/research/{id}/group/route.ts` — mover competidor (o en route.ts del research).
- `src/app/api/trash/route.ts` + `restore/route.ts` — papelera global.
- `src/app/(dashboard)/research/page.tsx` — nueva vista Grupos.
- `src/components/research/group-card.tsx` + `group-competitors.tsx` (+ config).
- `src/app/(dashboard)/trash/page.tsx` — papelera global.
- `src/lib/i18n/{es,en,ar}.json` — keys nuevas.
- `src/lib/help-content.ts` + `GLOSARIO.md` (regenerado con `npm run build:glossary`) — términos nuevos.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npm run lint` → solo warnings pre-existentes.
- `npm run test:run` → todos PASS.
- `npm run build` → OK.
- `npm run build:glossary` → regenerar GLOSARIO.md.

## Fuera de scope

- Migraciones a aplicar en prod (las aplica el usuario, como siempre).
- Deep dive Grok (sigue bloqueado por créditos xAI) — no se toca.
- Papelera en tablas transaccionales (sales, stock_movements, logs, etc.).
- Migración de datos existentes a grupos (los productos previos quedan en "Sin grupo").