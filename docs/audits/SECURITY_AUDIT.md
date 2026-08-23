# Security Audit — Multi-Tenant

Fecha: 2026-08-23 | Método: revisión independiente read-only + verificación local y Supabase prod.

## Matriz de recursos relevantes

| Resource | Auth | Org-scoped | Role | RLS | Service-role | Cross-tenant risk |
|---|---|---|---|---|---|---|
| `/api/mcp` | Sesión (handler) | ✓ ctx.orgId (header sin verificar) | n/a | ✓ | No | Medio (H1) |
| `/api/share/[token]` | **Público, deshabilitado** | n/a | n/a | n/a | No | Mitigado operacionalmente (M1) |
| `/api/cron/*` | Bearer secret ✓ | ✓ `org_id` + membership por schedule/rule | n/a | bypass | **Sí** | Mitigado (M2) |
| `/api/sp-api/webhooks` POST | Secret **opcional** | ✗ `.limit(1)` global | n/a | bypass | **Sí** | **CRÍTICO (C3)** |
| `/api/orgs/accept` | Sesión | invite.org_id | role del invite | **USING(true)** | No | **CRÍTICO (C1)** |
| `/api/drive/*` | Sesión | ✓ membership + allowlist de orgs; folderId contenido en root | owner/admin/editor en mutaciones | n/a (Google) | Sí (token read) | Compartido intencionalmente entre orgs autorizadas |
| `/api/products/[id]`, `/orders/[id]`, `/export` | Sesión (handler) | ✓ `.eq(org_id)` | n/a | ✓ | No | Bajo |
| `/api/fba-shipments*` | Sesión | ✓ `org_id` + PO | owner/admin/editor en mutaciones | ✓ `is_org_member(org_id)` + relaciones desde 052-053 | No | Mitigado |

## Findings

### C1 🔴 Invitaciones secuestrables por cualquier usuario autenticado
- `supabase/migrations/024_multi_tenant.sql:280-281`: policy `org_inv_update ... FOR UPDATE USING (true)` — cualquier usuario autenticado puede UPDATE todas las invitaciones pendientes y leerlas (`org_inv_select` matchea por su email tras el cambio), obtener `token`+`role` y aceptarse como admin/owner de orgs arbitrarias vía `/api/orgs/accept`.
- Fix propuesto: `org_inv_update` restringida (sistema/admin de la org); SELECT solo por invitación propia ya existente o vía token exacto. Requiere migración nueva + aplicación manual en prod (aprobación owner).

### C2 🔴 Drive IDOR entre tenants
- El Drive compartido es una decisión explícita para las tres organizaciones autorizadas, no un acceso global para cualquier tenant.
- `GOOGLE_DRIVE_SHARED_ORG_IDS` limita server-side las organizaciones permitidas; las demás reciben `403`. `folderId` sigue validándose dentro del root configurado.
- Las rutas pasan el usuario autenticado a `getDriveClient()`, que solo usa OAuth2 por usuario y falla cerrado sin refresh token.

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
- **M1**: share público tenía riesgo de exposición cross-tenant y tokens bearer sin hash/expiry obligatorio. Mitigación operacional: `/api/share`, `/api/share/[token]` y `/share/[token]` quedan deshabilitados; la corrección estructural del feature sigue pendiente si se reactiva.
- **M2**: crons `reports`/`alerts` tenían riesgo de scope legacy por `user_id`. Mitigado: consultan por `org_id` y validan membership activa antes de procesar cada schedule/rule.
- **M3**: `resolveOrgId` auto-provisionaba org con service role y slug predecible. Mitigado: el resolver ya no provisiona; el dashboard usa un flujo explícito de onboarding con slug aleatorio.
- **M4**: mutaciones de órdenes, reglas de reorden, shipments y cotizaciones permitían viewers. Mitigado: requieren `owner/admin/editor`.

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
| C1 | `supabase/migrations/036_fix_org_invitations_rls.sql`: policy `org_inv_update` restringida a invitado (email) u owner/admin de la org + GRANT por columna (solo `status` actualizable) | Aplicada y verificada en prod el 2026-08-22; falta solo evidencia opcional adicional de `pg_policies` |
| C2 | `src/lib/drive/folder-guard.ts`: contención por cadena de ancestros hasta el root configurado, allowlist explícita de organizaciones compartidas y OAuth2 obligatorio por usuario | `folder-guard.test.ts` + `client.test.ts` |
| C3 | Webhook fail-closed: sin `SP_API_WEBHOOK_SECRET` responde 503; comparación timing-safe; suscripción seleccionada por `amazon_subscription_id` del payload (`notificationMetadata`), no `.limit(1)` global | `webhook-auth.test.ts` 7 tests |
| H1 | `createApiHandler` verifica membership activa del `x-org-id` (403 si no); `getOrgId` ignora header ajeno y cae al org default | `org-resolver.test.ts` 3 tests |
| H2 | Sin Upstash o ante error de Upstash: límite en memoria por instancia (ventana fija, tope 10k claves). Ya no es fail-open total. Limitación: memoria no compartida entre lambdas | `rate-limit.test.ts` 2 tests |
| H3 | `supabase/migrations/052-056`: backfill inequívoco, policies org-scoped, roles, relaciones tenant, triggers de producto, onboarding atómico y legacy relations | Aplicadas en prod; 0 filas con `org_id` null; policies, triggers y RPC restringida verificadas |

Suite completa post-fixes: 524 tests OK · tsc 0 · lint sin errores nuevos · build OK · E2E 16/16.

**Nota Drive compartido:** el workspace completo está habilitado intencionalmente para las tres organizaciones configuradas en producción; organizaciones fuera de la allowlist no tienen acceso. Falta la prueba autenticada con los tres usuarios y la misma cuenta Google dedicada.
