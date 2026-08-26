# QA LOG — Testing funcional con datos reales

Prompt Maestro FASE 11 · Iniciado 2026-08-22

## Ambiente

- Producción: `https://amazon-fba-manager-virid.vercel.app` (único ambiente disponible — **NO existe staging**; CRUD de pruebas solo con org/usuario de prueba dedicado).
- Migración `036_fix_org_invitations_rls.sql`: aplicada en prod por el owner el 2026-08-22. **VERIFICADA**: `information_schema.column_privileges` confirma que `authenticated` tiene UPDATE solo en `status` (SELECT/INSERT/REFERENCES completos, sin UPDATE en otras columnas). Falta output de `pg_policies` para confirmar qual de la policy (opcional).

## Inventario real de módulos (fuente: código, no docs viejas)

API: products(+summary/suppliers), suppliers(+quotes/products), inventory(+movements/summary), orders(+[id]), sales(+import/summary), expenses, ppc-campaigns, reimbursements, returns, amazon-payouts, fba-shipments(+[id]), forecasting, alerts(rules/history), calculator(+save), research(capture/analyze/groups/scoring), drive(9 rutas), sp-api(connections/sync/webhooks), orgs(invite/accept/members), members(+[id]), tasks, comments, notifications, push(sub/unsub), trash(+restore), share(+token), governance, board-decisions, audit-log, schedules, reorder-rules, import(+template), export, search, scrape, settings(+avatar), dashboard, analytics/comparison, automation(forecasting/notifications/weekly-summary), cron(alerts/reports/sync), mcp, auth(login/register/reset/update-password).

Páginas dashboard: ads, alerts, analytics, calculator, dashboard, drive, finances, forecast, import, inventory, members(+edit/new), orders(+[id]), products(+new/edit/[id]), research, returns, sales, settings, shipments, sp-api, suppliers(+compare/new/edit/[id]), tasks, team, trash.

## Resultados automatizados

### Verificación EN VIVO post-deploy (2026-08-22, commits 5e23457..1052c6d en prod)

| Módulo | Función | Dato utilizado | Resultado esperado | Resultado obtenido | Estado | Fecha | Evidence |
|---|---|---|---|---|---|---|---|
| Webhooks SP-API (C3) | POST sin auth pre-deploy | body {} sin Bearer | antes del fix: procesa igual | **200 {received:true}** (vulnerabilidad confirmada en vivo) | WARN* | 2026-08-22 | curl pre-deploy |
| Webhooks SP-API (C3) | POST sin auth post-deploy | ídem | fail-closed | **503 {"error":"Webhook no configurado"}** | PASS | 2026-08-22 | curl post-deploy |
| Webhooks SP-API (C3) | secret seteado por owner + redeploy | POST sin/wrong Bearer | 401 | **401 Unauthorized** en ambos | PASS | 2026-08-22 | curl post-redeploy |
| Webhooks SP-API (C3) | Bearer CORRECTO + JSON válido con subscriptionId inexistente | notificationId qa-live-002 | 200 received:true, sin atribución a ninguna org | **200 {"received":true}** | PASS | 2026-08-22 | curl |
| Webhooks SP-API (C3) | JSON malformado (artifact de quoting PowerShell en primer test) | body con ' literales | error controlado, no crash | **500 controlado por catch** (mejora opcional: 400) | WARN | 2026-08-22 | reproducido y explicado |
| Schema prod vs código | columnas reales tablas webhook | query read-only service-role | código asume org_id | **org_id NO existía** en `sp_api_webhook_subscriptions` (42703) ni `sp_api_webhook_logs` (PGRST204) → select de suscripción SIEMPRE fallaba → ninguna notificación se atribuiría jamás, incluso con seller conectado | FAIL → **FIXED** | 2026-08-22 | repro node local contra prod |
| Migración 037 | ADD COLUMN org_id x2 | Management API + token de `.env.local` (aplicado por agente con aprobación owner) | columnas creadas sin error | aplicado; SELECT con org_id OK en ambas tablas; smoke webhook 200 received:true post-fix | PASS | 2026-08-22 | curl + node verify |
| Integraciones | sp_api_connections | select limit 1 | descubrir estado | **tabla vacía** → SP-API NOT CONFIGURED (webhooks sin tráfico real hoy; mismatch era latente y ya está corregido) | NOT CONFIGURED | 2026-08-22 | ídem |

### Schema mismatch resuelto

Migración `037_add_org_id_to_webhook_tables.sql` aplicada en prod el 2026-08-22 vía Management API (token provisto por owner en `.env.local`, nunca expuesto en chat). Verificado: selects con `org_id` sin error en ambas tablas + smoke test del endpoint 200.
| Webhooks SP-API (C3) | POST con Bearer incorrecto | Bearer wrong-secret | 401 si secret configurado; 503 si no | 503 (secret NO está configurado en prod) | WARN | 2026-08-22 | curl |
| Configuración | SP_API_WEBHOOK_SECRET en prod | env | descubrir estado | **NO CONFIGURADO** → webhooks SP-API deshabilitados hasta setearlo; re-crear destination/subscription si las hay (token random UUID viejo no matcheará) | WARN | 2026-08-22 | respuesta 503 |
| Rate limiting (H2) | límite real /api/products | 70 GET rápidos sin auth | ~60/min luego 429 | **66×401 + 4×429**, headers `Retry-After: 60`, `X-Ratelimit-Remaining: 0` | PASS | 2026-08-22 | curl loop |
| Drive (C2) | list sin auth | GET /api/drive/list | 401 | 401 Unauthorized | PASS | 2026-08-22 | curl |
| Salud general | /login | GET | 200 + CSP nonce | 200, CSP con nonce en respuestas | PASS | 2026-08-22 | curl |
| RLS C1 (org_invitations) | GRANT por columna | information_schema.column_privileges | UPDATE solo status | UPDATE solo en `status`; sin UPDATE en role/org_id/token/email/expires_at | PASS | 2026-08-22 | output SQL del owner |

\* El WARN pre-deploy documenta el estado vulnerable encontrado; el fix ya estaba en el commit pusheado.

| Módulo | Función | Dato utilizado | Resultado esperado | Resultado obtenido | Estado | Fecha | Evidence |
|---|---|---|---|---|---|---|---|
| Suite completa | vitest run | — | todos verdes | 55 archivos / 436 tests OK | PASS | 2026-08-23 | `npm test -- --run` |
| Tenant isolation | getOrgId ignora x-org-id ajeno | header org-de-victima | fallback a org propia | org-default-provisionada | PASS | 2026-08-22 | src/lib/org-resolver.test.ts |
| Rate limiting | sin Upstash → memoria | 6 req / límite 5 | bloquea la 6ta | allowed=false, remaining=0 | PASS | 2026-08-22 | src/lib/rate-limit.test.ts |
| Rate limiting (config real) | Upstash sliding window | código | descubrir límite vigente | 60 req/min fijo SOLO en rutas con createApiHandler; rutas manuales sin cobertura | WARN | 2026-08-22 | docs/audits/SECURITY_AUDIT.md |
| Extensión Chrome | parseLocalizedNumber $1,299.99 / $9.99 / 1,234 | formatos US | parseo correcto | 1299.99 / 9.99 / 1234 | PASS | 2026-08-22 | src/chrome-extension/content/parse-number.test.ts |
| Extensión Chrome | parseLocalizedNumber texto compuesto | "4.5 out of 5 stars" | 4.5 | 4.5 | PASS | 2026-08-23 | `parse-number.test.ts` |
| Extensión Chrome | parseLocalizedNumber sufijo K/M | "10K+ ratings" | 10000 | 10000 | PASS | 2026-08-23 | `parse-number.test.ts` |

### Detalle de fixes del parser

**PASS 1 — concatenación de números corregida**
- Repro: `parseLocalizedNumber("4.5 out of 5 stars")`
- Resultado: 4.5
- Severity: media (afecta average_rating del overlay si cae por esa ruta)
- Layer: chrome-extension/content (parse-number.ts)
- Regression test: pasa en `parse-number.test.ts`
- Fix: extraer el primer token numérico sin concatenar dígitos contextuales posteriores

**PASS 2 — sufijos K/M/B corregidos**
- Repro: `parseLocalizedNumber("10K+ ratings")`
- Resultado: 10000
- Severity: media (review_count subestimado ×1000)
- Layer: ídem
- Regression test: pasa en `parse-number.test.ts`
- Fix: aplicar multiplicadores K/M/B después del parseo numérico

### QA autenticado end-to-end con usuario de prueba (2026-08-22/23, Playwright contra prod)

Setup: usuario `qa-agent-temp-20260822@test.local` creado por SQL directo (GoTrue admin API devolvía 500 genérico; filas hand-made requieren tokens vacíos `''` y `provider_id`=UUID para no romper el scan de GoTrue). Login por UI real en `/login` → dashboard. Fetches desde el navegador (cookies SSR), que es el flujo de usuario verdadero.

#### 🚨 Hallazgo CRÍTICO: recursión infinita RLS (42P17) — presente desde migración 024

- Evidencia: `GET /rest/v1/org_members` y `/organizations` con JWT válido → `{"code":"42P17","message":"infinite recursion detected in policy for relation \"org_members\""}`.
- Causa: `org_members_select` subconsulta su propia tabla; políticas de `organizations` subconsultan `org_members` (recursión cruzada).
- Impacto histórico: `resolveOrgId` fallaba siempre como usuario → caía al fallback service-role → rutas operaban sin verificar membresía (la vulnerabilidad H1). El fix H1 desplegado expuso el bug: check de membresía vs tabla rota → **403 en todas las rutas con wrapper** (`products/sales/orders/suppliers`) y capture 500. Outage parcial en vivo, detectado y curado en la misma sesión.
- Fix: migración `038_fix_org_members_rls.sql` — funciones `SECURITY DEFINER STABLE` (`org_is_active_member/org_is_admin/org_is_owner`) + reescritura de las 7 políticas. Aplicada en prod vía Management API con aprobación explícita del owner. Verificado: `pg_policy` muestra las 8 políticas esperadas; PostgREST devuelve filas propias (y SOLO las propias) sin error.

#### Batería final post-fix (12 PASS / 0 FAIL)

| Check | Resultado |
|---|---|
| QA0 login UI → dashboard | PASS |
| QA1 GET /api/products autenticado (pre-fix: 403) | PASS |
| QA2 H1: x-org-id falso → 403 | PASS |
| QA3 org huérfana sin membership → 403 | PASS |
| QA4 drive/list folderId=root | INFO 403 "Carpeta fuera del espacio autorizado" (guard C2 activo; GOOGLE_DRIVE_FOLDER_ID seteado en prod rechaza alias) |

Nota posterior: desde el despliegue del workspace compartido, `folderId=root` es válido únicamente para las organizaciones incluidas en `GOOGLE_DRIVE_SHARED_ORG_IDS`; las demás siguen recibiendo `403`.
| QA5a POST research/capture (pre-fix: 500 recursión) | PASS |
| QA5b fila persistida con org_id correcto (`asin_reference`, source=capture) | PASS |
| QA5c GET /api/research → 200 | PASS |
| QA6a POST crea producto | PASS |
| QA6b org_id correcto en DB | PASS |
| QA6c PUT actualiza (la ruta usa PUT, no PATCH) | PASS |
| QA6d GET por id → 200 | PASS |
| QA6e DELETE ok (eliminación física confirmada en DB) | PASS |

Notas: `products/[id]` exporta GET/PUT/DELETE (no PATCH). Limpieza automática de datos de prueba tras cada corrida.

### Parte B — extensión de batería a Suppliers/Sales/Inventory (2026-08-23)

Script permanente `scripts/qa-battery.js` (`npm run qa:battery`, creds en `.env.local`). Resultado final **22 PASS / 1 FAIL**.

| Check | Resultado |
|---|---|
| QA0–QA6f (regresión batería original) | 14/14 PASS |
| QA7a POST /api/suppliers crea | PASS |
| QA7b org_id correcto en DB (`suppliers`) | PASS |
| QA7c PUT actualiza (name+status) | PASS |
| QA7d GET /api/suppliers → 200 | PASS |
| QA7e DELETE ok | PASS |
| QA8-0 producto efímero para ventas | PASS |
| QA8a POST /api/sales crea (product_id, units_sold=2, revenue) | PASS |
| QA8b org_id correcto en DB (`sales`) | PASS |
| QA8c GET /api/sales → 200 | PASS |
| QA8d GET /api/sales/summary refleja la venta (revenue 49.98, units 2) | INFO OK |
| QA9a GET /api/inventory → 200 | PASS |
| QA9b POST /api/inventory/movements adjustment qty=5 | **FAIL → 400 "Error interno del servidor"** |

#### Hallazgo CRÍTICO #2: mismatch schema↔código masivo — `org_id` ausente en tablas tenant-scoped

- Causa raíz QA9b: `stock_movements` NO tiene columna `org_id` en prod; la ruta inserta `org_id` → error PostgREST → catch genérico 400. La ruta **nunca funcionó**.
- Auditoría sistemática (`information_schema` vs código): el código escribe/filtra por `org_id` en estas tablas que NO tienen la columna:
  - `stock_movements` (movements route) · `inventory` (sync-runner upsert) · `ppc_campaigns` (insert ruta ppc-campaigns) · `amazon_payouts` (GET .eq + insert) · `saved_calculations` (calculator/save) · `supplier_quotes` (quotes route) · `product_suppliers` (products/[id]/suppliers) · hermana no usada aún: `ppc_daily_metrics`.
- Fix preparado: `supabase/migrations/039_add_org_id_to_tenant_tables.sql` (ADD COLUMN IF NOT EXISTS nullable + FK a organizations + índices). Pendiente aprobación para aplicar en prod.
- Correctamente SIN org_id (no son tenant tables): `profiles`, `organizations`, `user_settings`, `company_members`.

#### Hallazgo CRÍTICO #3: 9 rutas leen `profiles.org_id` (columna inexistente)

Rutas afectadas (patrón `.from("profiles").select("org_id")`): `amazon-payouts` (×2), `automation/weekly-summary`, `research/analyze`, `sp-api/sync` (×2), `sp-api/webhooks/subscribe` (×3), `sp-api/webhooks` (GET), `sp-api/connections` (+[id]), `sp-api/auth/callback`. Comportamiento probable: PGRST204 → orgId undefined → fallo o resultado vacío; fail-closed esperable por RLS vigente (sin leak cross-tenant confirmado). Requiere decisión owner:
- **Opción A**: agregar `profiles.org_id` + trigger de sync desde `org_members` (revive 9 rutas sin tocar código; duplica fuente de verdad).
- **Opción B (recomendada)**: refactor de las 9 rutas al resolvedor estándar `getOrgId` de `src/lib/api-handler.ts`.

### Resolución hallazgos #2 y #3 (2026-08-23, aprobación explícita del owner)

1. **Migración 039 aplicada en prod** vía Management API en 3 lotes (ALTER ×8, índices ×8). Verificado con `information_schema`: las 8 tablas tienen `org_id`. Re-corrida de batería completa post-migración: **24 PASS / 0 FAIL** (QA9b/QA9c ahora verdes).
2. **Refactor Opción B aplicado** (commit `0ddefc9`): las rutas `amazon-payouts` (GET/POST), `research/analyze`, `sp-api/sync` (GET/POST), `sp-api/webhooks/subscribe` (POST/DELETE/GET), `sp-api/webhooks` (GET logs), `sp-api/connections` (+[id] DELETE), `sp-api/auth/callback` ahora usan `getOrgId(supabase, user.id, req)`. Caso especial `automation/weekly-summary` (cron service-role): itera `org_members` activos en vez de usuarios+profiles; shape de respuesta intacta (clave=user_id). Cero referencias restantes a `profiles.org_id`. Verificación: typecheck OK · lint sin warnings nuevos · **53 archivos / 425 tests OK** · build de producción OK. Pendiente: verificar en vivo tras deploy (las rutas SP-API requieren conexión real del owner).

### Parte D — invalid data + orders/expenses/returns + probes post-refactor (2026-08-23)

Batería extendida a 39 checks. Resultado pre-deploy: **38 PASS / 1 FAIL** (el FAIL se corrige con el deploy de este mismo ciclo).

| Grupo | Checks | Resultado |
|---|---|---|
| QA10 rutas refactorizadas getOrgId en vivo | sp-api/connections 200 [], amazon-payouts 200 | PASS ×2 |
| QA11 datos inválidos | sin nombre→4xx · costo negativo→4xx · units_sold=0→4xx · id malformado→(500→**fix**) · x-org-id garbage→controlado · expense inválido→4xx | PASS ×5, FAIL×1→FIX |
| QA12 orders/expenses/returns CRUD + org_id DB | POST+GET+persistencia org_id ×3 módulos | PASS ×7 |

#### Hallazgo #4: ninguna ruta dinámica validaba formato UUID del param `id` (13 rutas)

`GET /api/products/esto-no-es-uuid` → 500 (PostgREST 22P02 sin control). Auditadas las 14 rutas `[id]`: cero guards previos; Drive excluido (usa IDs de Google). Fix: helper `isValidUuid()` en `src/lib/api-utils.ts` + guard 400 temprano en products/[id] (GET/PUT/DELETE), suppliers/[id] (×3), orders/[id] (×3), tasks/[id], members/[id] (×3), fba-shipments/[id] (×3), board-decisions/[id], research/groups/[id], research/[id]/group, sp-api/connections/[id]. Tests existentes actualizados a UUIDs válidos donde mockeaban params (semántica intacta).

Nota QA11b: primer intento usaba clave inexistente (`costo_unitario`) — zod la strippeó y creó producto (falso positivo del script, no bug); el schema real valida camelCase `unitCost.min(0)` correctamente.

Verificación post-deploy (commit `1ab4750`): typecheck ✓ · lint ✓ · 425/425 tests ✓ · build ✓ · batería completa **39 PASS / 0 FAIL** contra prod (QA11d → 400 controlado).

### Parte E/F/G — lifecycles, multi-org UI y Drive (2026-08-23)

Batería ampliada a **54 PASS / 0 FAIL**, con dos límites funcionales documentados como INFO.

| Grupo | Resultado |
|---|---|
| Flow A purchase lifecycle | PASS: orden avanza `draft → sent → confirmed → in_production → shipped → in_transit → customs → delivered`; `total_cost = quantity × unit_cost` y landed cost agrega shipping/customs/prep correctamente; `org_id` conservado |
| Flow B incident lifecycle | PASS parcial: devolución creada en `requested` con `refund_amount=12.5` y `org_id` correcto. La ruta `/api/returns/[id]` ya existe para avanzar estados; falta repetir el flujo completo en producción |
| Multi-org API | PASS: membership real QA en Org B (`editor`), Org B no recibe productos de Org A, producto B queda con `org_id` B y Org A no lo lista |
| Multi-org UI | PASS: página `/products` autenticada en contexto Org A no muestra el producto creado en Org B |
| Drive OAuth conexión | PASS producción: cuenta autorizada y carpeta `backup` visible en la app |
| Drive upload/list/metadata/rename/delete | PENDIENTE EXTERNO: ejecutar CRUD manual o QA15 con `QA_DRIVE_CRUD_ALLOW=I_UNDERSTAND_NON_PRODUCTION` y hostname exacto en `QA_DRIVE_ALLOWED_HOSTS`, solo en entorno no productivo; eliminar el secret OAuth antiguo tras E2E |

La prueba multi-org UI valida aislamiento desde la vista Org A; el cambio visual explícito de organización queda pendiente de una sesión visual del owner. Seller Central/SP-API queda deliberadamente fuera de esta fase.

### Parte H — endurecimiento final (2026-08-23)

| Verificación | Resultado |
|---|---|
| Migraciones 052-056 en producción | PASS: `fba_shipments` 0/1 filas sin `org_id`, `fba_shipment_items` 0/0; RLS activa; policies con roles/relaciones tenant, triggers product/supplier, RPC restringida e índices presentes |
| OAuth Drive | PASS producción: redirect URI, state CSRF, Vercel y autorización de cuenta verificados; falta CRUD de archivo |
| Roles de mutación | PASS local: órdenes, reorder rules, shipments y supplier quotes rechazan `viewer` |
| Verificación local | PASS: 543 tests, typecheck, build y E2E 16/16; lint solo conserva warnings preexistentes |

## Pendientes manuales (requieren sesión del owner en prod)

| Ítem | Estado | Nota |
|---|---|---|
| Extensión con ASINs reales variados (comparar asin/title/price/BSR/reviews/rating/category/brand vs página) | BLOCKED | requiere navegador del owner; verificar los 2 FAILs arriba en datos reales |
| Research capture → API → Supabase → UI → reload | PARCIAL | persistencia API→DB verificada por agente (QA5b); falta verificación visual de UI |
| Drive upload → list → metadata → rename → delete | PENDIENTE EXTERNO | Código OAuth, validaciones y batería QA15 listas; requiere autorización del owner |
| SP-API vs Seller Central / Keepa | NOT CONFIGURED (si sin conexión activa) | no forzar |
| Multi-org: Org A jamás ve Org B (UI + API + manipulación de identifiers) | PARCIAL | Parte E/F cubre membership real, API y UI Org A; falta cambiar explícitamente de org desde el selector visual |
| CRUD por módulo (20 módulos candidatos) | PARCIAL | Products + Suppliers + Sales CRUD completo verificado (QA6/QA7/QA8); Inventory GET/movements y Returns detail cubiertos localmente; falta prueba live de Returns |
| Flow A purchase lifecycle + Flow B incident lifecycle | PARCIAL | Flow A completo automatizado; Flow B ya tiene endpoint para avanzar estados, falta repetir flujo completo en producción |
| Invalid data (vacío/negativos/futuros/malformed IDs) | PARCIAL | Guards y tests locales verdes; falta repetir batería live tras los últimos cambios |
| Offline/PWA | BLOCKED | validar solo lo prometido por el producto |
| Webhook SP-API sin secret → 503 | HECHO | verificado en vivo: sin Bearer 401, wrong 401, correcto 200 (secret seteado por owner) |

## Verificación migración 036 (pegar en Supabase SQL Editor)

```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname='public' AND tablename='org_invitations';

SELECT privilege_type, column_name FROM information_schema.column_privileges
WHERE table_name='org_invitations' AND grantee='authenticated';
```

Esperado: policy `org_inv_update` con qual que referencie email u org_members (NO `(true)`); privilegios UPDATE solo sobre columna `status`.

## Verificación migraciones 041 y 042 (2026-08-23)

| Migración | Método | Resultado | Verificación |
|---|---|---|---|
| 041 `amazon_settlement_lines` | Management API | APLICADA | columnas tenant-scoped, UNIQUE `(org_id, settlement_id, line_hash)`, trigger de integridad, RLS con solo `SELECT`/`INSERT` |
| 042 products SKU | Management API | APLICADA | UNIQUE `(org_id, sku)` confirmado; constraint histórica por `user_id` eliminada |

## Verificación migraciones 043-050 (2026-08-23)

| Migraciones | Método | Resultado | Verificación |
|---|---|---|---|
| 043-049 | Management API | APLICADAS | source key tenant-scoped, schema bootstrap, bucket `reportes` privado, RLS webhook/comments/legacy y tablas de automatización |
| 050 | Management API | APLICADA | backfill determinista de `inventory.org_id` desde `products.org_id`; sin filas ambiguas modificadas |

El preflight encontró cuatro filas históricas de `inventory` sin `org_id`; todas
tenían producto con organización inequívoca y fueron backfilleadas por 050.
Las filas legacy ambiguas de las demás tablas permanecen inaccesibles por RLS.

## Fase 4: detección de reembolsos Amazon (2026-08-23)

| Área | Resultado | Evidencia |
|---|---|---|
| Parser `GET_FBA_REIMBURSEMENTS_DATA` | VERIFICADO | TSV con campos oficiales, importes, cantidades y `raw_row` |
| Matching SKU/ASIN | VERIFICADO | SKU primero; ASIN solo único por organización/marketplace; conflictos fail-closed |
| Matching inventory | VERIFICADO | Candidatos `damaged`/`removal` dentro de ventana de 30 días; no modifica stock |
| Idempotencia | VERIFICADO LOCAL | `UNIQUE(org_id, source_key)` y reemplazo atómico de matches mediante RPC |
| Seguridad tenant | VERIFICADO LOCAL | RLS, triggers de tenant, role gates y pruebas independientes |
| Checks | VERIFICADO LOCAL | 86 archivos, 543 tests, typecheck, build y lint sin errores nuevos |
| Migración 051 | APLICADA Y VERIFICADA | Tablas, 4 policies y RPC confirmados en producción el 2026-08-23 |
| Returns detail | VERIFICADO LOCAL | GET/PUT `[id]`, UUID guard, org scope, editor+ role gate y product ownership en POST |

## Auditoría de referencias tenant (2026-08-23)

| Consulta | Resultado |
|---|---|
| `returns.product_id` con `products.org_id` distinto | 0 filas |
| `reimbursements.product_id/return_id` con org distinta | 0 filas |
| Policies de `reimbursements` | `delete`, `insert`, `select`, `update`; sin policies legacy adicionales |

## Share deshabilitado por M1 (2026-08-23)

| Superficie | Resultado | Evidencia |
|---|---|---|
| `/api/share` GET/POST/DELETE | DESHABILITADO | Devuelve 503 antes de autenticación o consultas |
| `/api/share/[token]` | DESHABILITADO | Devuelve 404 antes de crear service role client |
| `/share/[token]` | DESHABILITADO | Devuelve not-found antes de consultar Supabase |
| Analytics Share UI | OCULTO | `ShareDashboard` y sus datos permanecen intactos para futura reactivación |
