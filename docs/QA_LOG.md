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
| Suite completa | vitest run | — | todos verdes | 51 archivos / 424 tests OK | PASS | 2026-08-22 | CI local, commits 3899e94..7ca2209 |
| Tenant isolation | getOrgId ignora x-org-id ajeno | header org-de-victima | fallback a org propia | org-default-provisionada | PASS | 2026-08-22 | src/lib/org-resolver.test.ts |
| Rate limiting | sin Upstash → memoria | 6 req / límite 5 | bloquea la 6ta | allowed=false, remaining=0 | PASS | 2026-08-22 | src/lib/rate-limit.test.ts |
| Rate limiting (config real) | Upstash sliding window | código | descubrir límite vigente | 60 req/min fijo SOLO en rutas con createApiHandler; rutas manuales sin cobertura | WARN | 2026-08-22 | docs/audits/SECURITY_AUDIT.md |
| Extensión Chrome | parseLocalizedNumber $1,299.99 / $9.99 / 1,234 | formatos US | parseo correcto | 1299.99 / 9.99 / 1234 | PASS | 2026-08-22 | src/chrome-extension/content/parse-number.test.ts |
| Extensión Chrome | parseLocalizedNumber texto compuesto | "4.5 out of 5 stars" | 4.5 | **4.55** (concatena dígitos) | FAIL | 2026-08-22 | test "BUG CONOCIDO" en parse-number.test.ts |
| Extensión Chrome | parseLocalizedNumber sufijo K/M | "10K+ ratings" | 10000 | **10** (sufijo descartado) | FAIL | 2026-08-22 | idem |

### Detalle de FAILs (formato obligatorio)

**FAIL 1 — concatenación de números**
- Repro: `parseLocalizedNumber("4.5 out of 5 stars")`
- Expected: 4.5 · Actual: 4.55
- Severity: media (afecta average_rating del overlay si cae por esa ruta)
- Layer: chrome-extension/content (parse-number.ts)
- Regression candidate: ya fijado en test "BUG CONOCIDO"
- Fix propuesto: extraer número objetivo por regex contextual antes de parsear

**FAIL 2 — sufijos K/M descartados**
- Repro: `parseLocalizedNumber("10K+ ratings")`
- Expected: 10000 · Actual: 10
- Severity: media (review_count subestimado ×1000)
- Layer: ídem
- Fix propuesto: detectar sufijos K/M/B y multiplicar

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

## Pendientes manuales (requieren sesión del owner en prod)

| Ítem | Estado | Nota |
|---|---|---|
| Extensión con ASINs reales variados (comparar asin/title/price/BSR/reviews/rating/category/brand vs página) | BLOCKED | requiere navegador del owner; verificar los 2 FAILs arriba en datos reales |
| Research capture → API → Supabase → UI → reload | PARCIAL | persistencia API→DB verificada por agente (QA5b); falta verificación visual de UI |
| Drive upload → list → metadata → delete | BLOCKED | validar también que IDs fuera del root ahora den 403 (fix C2); guard verificado con alias root |
| SP-API vs Seller Central / Keepa | NOT CONFIGURED (si sin conexión activa) | no forzar |
| Multi-org: Org A jamás ve Org B (UI + API + manipulación de identifiers) | PARCIAL | QA2/QA3 cubren manipulación de identifiers vía API; falta prueba visual multi-org en UI |
| CRUD por módulo (20 módulos candidatos) | PARCIAL | Products + Suppliers + Sales CRUD completo verificado (QA6/QA7/QA8); Inventory GET ok, movements BLOCKED por hallazgo #2 (migración 039 pendiente) |
| Flow A purchase lifecycle + Flow B incident lifecycle | BLOCKED | consistencia matemática en cada salto |
| Invalid data (vacío/negativos/futuros/malformed IDs) | BLOCKED | esperar error controlado |
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
