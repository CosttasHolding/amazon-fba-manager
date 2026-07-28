# PENDIENTE.md - Todo lo que falta y lo que se hizo

> Generado el 25/Jul/2026. Ultima actualizacion: 28/Jul/2026. Proyecto: Amazon FBA Manager v2
> URL: https://amazon-fba-manager-virid.vercel.app

---

## 1. LO QUE YA SE HIZO (Resumen)

### Seguridad y Deuda Tecnica (Fixes batch 1)
| Item | Archivos | Commit |
|------|----------|--------|
| Eliminar 3 violaciones `any` en team/page.tsx | `src/app/(dashboard)/team/page.tsx` | `8f3d6eb` |
| Fix 6 catch blocks silenciosos (theme-toggle, locale-context, settings, global-search) | 4 archivos | `8f3d6eb` |
| Fix 18 API catch blocks sin logging | expenses, amazon-payouts, reimbursements, returns, fba-shipments, ppc-campaigns, orders | `8f3d6eb` |
| Migrar alerts rules a createApiHandler + validacion de tipo | `src/app/api/alerts/rules/route.ts` | `8f3d6eb` |
| Marcar cron sync como stub | `src/app/api/cron/sync/route.ts` | `8f3d6eb` |
| Fix 14 catch blocks restantes en componentes | barcode-scanner, drive, notifications, hooks, etc. | `14e4e96` |
| Agregar loading.tsx a 11 paginas | ads, alerts, analytics, finances, forecasting, import, research, returns, shipments, sp-api, team | `14e4e96` |

### Fase 5: Server Components
| Pagina | Antes | Despues |
|--------|:-----:|:-------:|
| forecasting, ads, finances, analytics | Client | **Server** + Client Component |

### UI Optimization (Jul 26)
| Item | Archivos |
|------|----------|
| Sidebar con categorias + "More" sheet agrupado | `navigation.ts`, `sidebar.tsx`, `mobile-bottom-nav.tsx` |
| Search + Notifications en mobile top bar | `mobile-search-toggle.tsx`, `layout.tsx` |
| KPI grids `grid-cols-2` en mobile (7 archivos) | dashboard, finances, ads, forecasting, returns, page-skeleton, loading |
| Table padding `px-4 py-3` estandarizado (10 archivos) | data-table-wrapper, orders, suppliers/compare, team, import, sp-api, dashboard-client, members-table, revenue-projection, profitability-heatmap |
| Page transitions Framer Motion | `animated-page.tsx` + `layout.tsx` |

### URL Auto-Fill
Backend: `src/lib/scraping/`, `POST /api/scrape`
Frontend: `useUrlScrape`, `UrlImportDialog`, URL field en forms, Import button

### Research Bot
`src/lib/ai/client.ts`, `src/lib/ai/types.ts`, `src/lib/ai/prompts.ts`, `POST /api/research/analyze`, `product-analyzer.tsx`, `research/page.tsx`

### Auth Security (Jul 28 - NUEVO)
| Item | Commit |
|------|--------|
| Login/Register proxeados por API routes (ya no llaman directo a Supabase) | `4864e85` |
| Rate limiting con Upstash (login 5/min, register 3/hora, reset 3/hora) | `4864e85` |
| Password reset flow completo + pagina standalone `/reset-password` | `4864e85` |
| Zod validation server-side (8-16 chars, mayuscula, minuscula, numero) | `4864e85` |
| CSP hardening: nonce por request + strict-dynamic via middleware | `4864e85` |
| SUPABASE_SERVICE_ROLE_KEY movida de `.env` a `.env.local` | `4864e85` |
| Error messages seguros (nunca expone err.message al usuario) | `4864e85` |

---

## 2. LO QUE VOS TENES QUE HACER (PASO A PASO)

### PASO 1: Configurar Upstash ✅ (Completado)

Upstash Redis ya esta configurado en `.env.local` y en Vercel (Production, Preview, Development).

**Verificacion post-deploy:** Despues de deployar, intenta login 6 veces seguidas con una contraseña incorrecta. La 6ta vez debe decir "Demasiados intentos. Intentá de nuevo en 60 segundos."

---

### PASO 2: Configurar OPENAI_API_KEY ✅ (Completado)

OpenAI API Key ya esta configurada en Vercel (Production + Preview, encriptada).

**Verificacion post-deploy:** Una vez deployado, anda a Research > pega un ASIN > "Analizar con IA".

---

### PASO 3: NEXT_PUBLIC_APP_URL en Vercel (RECOMENDADO)

El proyecto ya usa `NEXT_PUBLIC_APP_URL` como variable. Seteala para que los links de password reset y Drive funcionen en prod.

Anda a: Vercel Dashboard > Project > Settings > Environment Variables

| Nombre | Valor | Entorno |
|--------|-------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://amazon-fba-manager-virid.vercel.app` | Production, Preview |

**En `.env.local`** ya tenes `NEXT_PUBLIC_APP_URL=http://localhost:3000` para desarrollo. No la cambies.

---

### PASO 4: Google Drive Redirect URI (solo si usas Drive)

**4a. En el codigo** - El redirect URI ya usa `NEXT_PUBLIC_APP_URL` (linea 17 de `src/lib/drive/client.ts`). Si seteas `NEXT_PUBLIC_APP_URL` en Vercel (Paso 3), funciona automaticamente. No necesitas cambiar nada en el codigo.

**4b. En Google Cloud Console** - Anda a Google Cloud Console > Credenciales > URI de redireccionamiento OAuth. Agrega:
```
https://amazon-fba-manager-virid.vercel.app/api/drive/auth/callback
```

---

### PASO 5: Deployar a Vercel

Una vez que seteas todas las variables de los Pasos 1-3, hace deploy:

```bash
git push origin main
```

Vercel hace deploy automatico. Verificar:
- ✅ Login funciona (proxy por API route)
- ✅ Register funciona (proxy por API route)
- ✅ Password reset: anda a `/reset-password`
- ✅ Rate limiting: 5 intentos fallidos de login → bloqueo 60s
- ✅ Research Bot: pegar ASIN > analizar

---

### OPCIONAL: SP-API Sync

Si usas Amazon SP-API (Selling Partner API) para sincronizar productos/ordenes/inventario:

**Codigo para pegaren `src/app/api/cron/sync/route.ts`:**

Reemplazar TODO el bloque `try { ... }` actual con esto:

```typescript
try {
  if (!process.env.SP_API_CLIENT_ID || !process.env.SP_API_CLIENT_SECRET) {
    throw new Error("SP_API_CLIENT_ID y SP_API_CLIENT_SECRET no configurados");
  }

  const supabase = createServiceRoleClient();
  const client = new SpApiClient({
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
    marketplace: connection.marketplace,
    sellerId: connection.seller_id,
  });

  let processed = 0;
  let failed = 0;

  if (syncType === "products") {
    const items = await getListings(client, connection.seller_id);
    for (const item of items) {
      try {
        await supabase.from("products").upsert({
          sku: item.sku,
          asin: item.asin,
          seller_id: connection.seller_id,
          org_id: connection.org_id,
        }, { onConflict: "sku" });
        processed++;
      } catch {
        failed++;
      }
    }
  }

  await supabase.from("sync_logs").update({
    status: "completed",
    items_processed: processed,
    items_failed: failed,
    completed_at: new Date().toISOString(),
  }).eq("id", log.id);

  return { syncType, status: "completed", processed, failed };
} catch (error) {
  await supabase.from("sync_logs").update({
    status: "failed",
    error_message: error instanceof Error ? error.message : "Sync error",
    completed_at: new Date().toISOString(),
  }).eq("id", log.id);
  return { syncType, status: "failed", processed: 0, failed: 0, error: error instanceof Error ? error.message : "Sync error" };
}
```

**Nota:** Requiere SP-API configurado en tu cuenta de Amazon Seller Central.

---

### OPCIONAL: SP-API Headers Fix

Si ves errores en llamadas SP-API, revisa `src/lib/sp-api/client.ts` y elimina estos headers si existen:
```typescript
"Amazon-Advertising-API-Scope": ...
"Amazon-Advertising-API-ClientId": ...
```
Esos headers son para la API de Ads (PPC), no para SP-API.

---

## 3. ACLARACIONES IMPORTANTES

### 3.1 Research Bot - Limitacion SP-API
El Research Bot usa `getCatalogItem()` que **SOLO trae** titulo, marca, categoria, imagen. NO trae precio, bullet points, descripcion, reviews. GPT-4o **estima** esos campos. Si queres datos reales, necesitas PA-API o Keepa.

### 3.2 Rate Limit ✅
Upstash Redis ya esta configurado. El rate limiter protege login (5/min), register (3/hora) y password reset (3/hora).

### 3.3 Password Reset - Supabase Emails
El reset de password usa `supabase.auth.resetPasswordForEmail()`. Los emails los envia Supabase Auth (plan Free: 50 emails/dia). El link de reset apunta a `NEXT_PUBLIC_APP_URL/reset-password`. Si no seteas `NEXT_PUBLIC_APP_URL` en Vercel (Paso 3), va a usar `http://localhost:3000/reset-password` en produccion (roto).

### 3.4 CSP y Nonces
El CSP se setea via middleware con un nonze aleatorio por request. En produccion usa `strict-dynamic` para scripts. Si ves errores de CSP en consola, avisame para ajustar.

---

## 4. RESUMEN EJECUTIVO (POR ORDEN)

| # | Paso | Donde | Tiempo | Estado |
|:-:|------|-------|--------|:------:|
| 1 | Crear Upstash Redis | https://console.upstash.com | 3 min | ✅ Hecho |
| 2 | Pegar `UPSTASH_REDIS_REST_URL` + `TOKEN` | `.env.local` + Vercel | 2 min | ✅ Hecho |
| 3 | Crear OpenAI API Key | https://platform.openai.com/api-keys | 2 min | ✅ Hecho |
| 4 | Pegar `OPENAI_API_KEY` | Vercel Environment Variables | 1 min | ✅ Hecho |
| 5 | Pegar `NEXT_PUBLIC_APP_URL` | Vercel Environment Variables | 1 min | 🔲 Pendiente |
| 6 | Agregar redirect URI Drive | Google Cloud Console | 2 min | 🔲 Pendiente |
| 7 | `git push origin main` | Terminal | 1 min | 🔲 Pendiente |
| 8 | SP-API sync code (opcional) | `src/app/api/cron/sync/route.ts` | 15 min | 🔲 Pendiente |
| 9 | SP-API headers fix (opcional) | `src/lib/sp-api/client.ts` | 2 min | 🔲 Pendiente |

**Pasos 3-4-5-7** son los minimos que faltan para que todo funcione. Los podes hacer en ~5 minutos.

---

## 5. ESTADO FINAL DEL PROYECTO

| Check | Item |
|:-----:|------|
| ✅ | Fase 1: Limpieza segura (deps fantasma, dead code, fmtMoney, SWR_CONFIG) |
| ✅ | Fase 2: Unificar codigo duplicado (getOrgId, Zod schemas, tipos, constantes) |
| ✅ | Fase 3: Extraer componentes compartidos (FormDialogLayout, form constants) |
| ✅ | Fase 4: Optimizar fetching y memoizacion (orders SWR, global-search, lazy) |
| ✅ | Fase 5: Server Components (forecasting, ads, finances, analytics) |
| ✅ | UI Optimization: Categorias, search mobile, KPI grids, padding, transiciones |
| ✅ | URL Auto-Fill + Research Bot + IA |
| ✅ | Auth Security: Rate limiting, password reset, CSP, service role key |
| ✅ | Security: `any` violations, catch blocks, logging |
| ✅ | Tests: 182 passing, 19 suites |
| ✅ | Build: 0 errores |
| ✅ | Deploy: https://amazon-fba-manager-virid.vercel.app |
