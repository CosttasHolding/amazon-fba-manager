# Security Audit — Multi-Tenant

Fecha: 2026-08-22 | Método: subagente read-only (`security-reviewer`) sobre HEAD `5e23457`. Sin tests de ejecución contra prod.

## Matriz de recursos relevantes

| Resource | Auth | Org-scoped | Role | RLS | Service-role | Cross-tenant risk |
|---|---|---|---|---|---|---|
| `/api/mcp` | Sesión (handler) | ✓ ctx.orgId (header sin verificar) | n/a | ✓ | No | Medio (H1) |
| `/api/share/[token]` | **Público** | ✗ scopeado por `user_id` | n/a | parcial | No | Medio (M1) |
| `/api/cron/*` | Bearer secret ✓ | ✗ legacy `user_id` | n/a | bypass | **Sí** | Medio (M2) |
| `/api/sp-api/webhooks` POST | Secret **opcional** | ✗ `.limit(1)` global | n/a | bypass | **Sí** | **CRÍTICO (C3)** |
| `/api/orgs/accept` | Sesión | invite.org_id | role del invite | **USING(true)** | No | **CRÍTICO (C1)** |
| `/api/drive/*` | Sesión | ✗ folderId del cliente | n/a | n/a (Google) | Sí (token read) | **CRÍTICO (C2)** |
| `/api/products/[id]`, `/orders/[id]`, `/export` | Sesión (handler) | ✓ `.eq(org_id)` | n/a | ✓ | No | Bajo |

## Findings

### C1 🔴 Invitaciones secuestrables por cualquier usuario autenticado
- `supabase/migrations/024_multi_tenant.sql:280-281`: policy `org_inv_update ... FOR UPDATE USING (true)` — cualquier usuario autenticado puede UPDATE todas las invitaciones pendientes y leerlas (`org_inv_select` matchea por su email tras el cambio), obtener `token`+`role` y aceptarse como admin/owner de orgs arbitrarias vía `/api/orgs/accept`.
- Fix propuesto: `org_inv_update` restringida (sistema/admin de la org); SELECT solo por invitación propia ya existente o vía token exacto. Requiere migración nueva + aplicación manual en prod (aprobación owner).

### C2 🔴 Drive IDOR entre tenants
- `drive/list|upload|folders/route.ts`: `folderId` del cliente sin validar ownership; `drive/client.ts:22-23` cae a service account compartida sin OAuth → listar/descargar/borrar backups financieros de otras orgs.
- Fix propuesto: derivar carpeta raíz por org y validar que `folderId` pertenezca al árbol permitido; eliminar fallback service-account o restringirlo a cron autenticado.

### C3 🔴 Webhook SP-API sin firma ni atribución
- `sp-api/webhooks/route.ts:9-15`: auth condicional (`if (webhookSecret)`); sin HMAC de Amazon; suscripción elegida por `notification_type .limit(1)` global sin seller/connection → notificaciones cruzadas entre orgs.
- Fix propuesto: exigir secret (fail-closed), validar firma SNS, seleccionar suscripción por `subscriptionArn`/connection y rechazar desconocidas.

### H1 🟠 Header `x-org-id` confiado sin verificar membership
- `api-handler.ts:49-53`, `org-resolver.ts:9-13`. Mitigado por RLS base, pero es única barrera y habilita enumeración.
- Fix: verificar membership en `createApiHandler` (query cacheada) y rechazar 403.

### H2 🟠 Rate limiting fail-open
- `rate-limit.ts:23-25`: sin Upstash no hay límite alguno; parámetros del handler ignorados (60/min hardcode); identidad `x-forwarded-for` spoofable.
- Fix: decidir política fail-open/closed documentada; cubrir rutas públicas (share brute-force, webhooks flood).

### MEDIUM
- **M1**: share público expone datos de TODAS las orgs del dueño (`user_id` legacy), token sin hash/expiry obligatorio.
- **M2**: crons `reports`/`alerts` filtran por `user_id` post-multi-tenant → mezclan/omiten orgs.
- **M3**: `resolveOrgId` auto-provisiona org con service role y slug predecible.

### LOW
- MCP bien construido (handler + org_id) pero opencode.json remoto sin credenciales explícitas.
- `company_members` con `UNIQUE(user_id)` legacy (tabla governance, baja exposición).
- Tablas sin policies org migradas: `comments`, `succession_events`, `members` (governance), `push_subscriptions`, `calculator_saves`, `sp_api_webhook_logs`.

## Rate limiting — realidad
60/min fijo vía Upstash sliding window, SOLO en routes con `createApiHandler`. Sin cobertura: `auth/*`, `share`, `drive/*`, `export/import/scrape/search`, webhooks POST, `settings/avatar`.

## Estado

**FIXES IMPLEMENTADOS (2026-08-22, aprobados por owner):**

| Finding | Fix | Verificación |
|---|---|---|
| C1 | `supabase/migrations/036_fix_org_invitations_rls.sql`: policy `org_inv_update` restringida a invitado (email) u owner/admin de la org + GRANT por columna (solo `status` actualizable) | Migración creada — **PENDIENTE aplicar en prod** (SQL Editor / Management API) |
| C2 | `src/lib/drive/folder-guard.ts`: contención por cadena de ancestros hasta el root configurado. Aplicado en list/upload/folders/rename/download/delete/update. Residual: si fallback service-account y sin `GOOGLE_DRIVE_FOLDER_ID`, el root es todo My Drive de la SA (aislación total requiere OAuth por usuario) | `folder-guard.test.ts` 9 tests |
| C3 | Webhook fail-closed: sin `SP_API_WEBHOOK_SECRET` responde 503; comparación timing-safe; suscripción seleccionada por `amazon_subscription_id` del payload (`notificationMetadata`), no `.limit(1)` global | `webhook-auth.test.ts` 7 tests |
| H1 | `createApiHandler` verifica membership activa del `x-org-id` (403 si no); `getOrgId` ignora header ajeno y cae al org default | `org-resolver.test.ts` 3 tests |
| H2 | Sin Upstash o ante error de Upstash: límite en memoria por instancia (ventana fija, tope 10k claves). Ya no es fail-open total. Limitación: memoria no compartida entre lambdas | `rate-limit.test.ts` 2 tests |

Suite completa post-fixes: 51 archivos / 412 tests OK · tsc 0 · lint sin errores nuevos · build OK.

**Pendiente:** MEDIUMs M1–M3 y LOWs sin fix (documentados arriba); aplicar migración 036 en producción.
