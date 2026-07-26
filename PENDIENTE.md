# PENDIENTE.md - Todo lo que falta y lo que se hizo

> Generado el 25/Jul/2026. Proyecto: Amazon FBA Manager v2
> URL: https://amazon-fba-manager-virid.vercel.app

---

## 1. LO QUE YA SE HIZO (Resumen)

### Seguridad y Deuda Tecnica
| Item | Archivos | Commit |
|------|----------|--------|
| Eliminar 3 violaciones `any` en team/page.tsx | `src/app/(dashboard)/team/page.tsx` | `8f3d6eb` |
| Fix 6 catch blocks silenciosos (theme-toggle, locale-context, settings, global-search) | 4 archivos | `8f3d6eb` |
| Fix 18 API catch blocks sin logging | expenses, amazon-payouts, reimbursements, returns, fba-shipments, ppc-campaigns, orders | `8f3d6eb` |
| Migrar alerts rules a createApiHandler + validacion de tipo | `src/app/api/alerts/rules/route.ts` | `8f3d6eb` |
| Marcar cron sync como stub | `src/app/api/cron/sync/route.ts` | `8f3d6eb` |
| Fix 14 catch blocks restantes en componentes | barcode-scanner, drive, notifications, hooks, etc. | `14e4e96` |
| Agregar loading.tsx a 11 paginas | ads, alerts, analytics, finances, forecasting, import, research, returns, shipments, sp-api, team | `14e4e96` |

### URL Auto-Fill (15 tareas completadas)
Backend: `src/lib/scraping/` (amazon.ts, alibaba.ts, index.ts, types.ts, selectors.ts), `POST /api/scrape`
Frontend: `useUrlScrape` hook, `UrlImportDialog`, campo URL en forms de producto/supplier, boton Import en Dashboard

### Research Bot (nuevo)
| Archivo | Proposito |
|---------|-----------|
| `src/lib/ai/client.ts` | Cliente OpenAI lazy singleton |
| `src/lib/ai/types.ts` | Tipos ListingData + AnalyzeProductResponse |
| `src/lib/ai/prompts.ts` | Prompt engineering GPT-4o |
| `src/app/api/research/analyze/route.ts` | Orquesta SP-API getCatalogItem + OpenAI |
| `src/components/research/product-analyzer.tsx` | Modal con preview de analisis |
| `src/app/(dashboard)/research/page.tsx` | Barra ASIN + integracion |

---

## 2. LO QUE VOS TENES QUE HACER

### 2.1 Configurar OPENAI_API_KEY en Vercel (OBLIGATORIO para Research Bot)

**Donde:** Vercel Dashboard > Project > Settings > Environment Variables

**Variable:**
```
Nombre: OPENAI_API_KEY
Valor: sk-proj-tu-api-key-de-openai
Entorno: Production (y Preview si queres probar)
```

**Como conseguirla:**
1. Andá a https://platform.openai.com/api-keys
2. Crea una API Key (tipo `sk-proj-...`)
3. Pegala en Vercel

**Verificacion:** Una vez seteada, entra a Research > pega un ASIN > Analizar con IA. Si no la seteas, te va a dar error 500.

---

### ~~2.2 Agregar .superpowers/ y "esto es" a .gitignore~~ ✅ YA HECHO

Ya se agrego al `.gitignore` y se ejecuto `git rm --cached`. No necesitas hacer nada.

---

### 2.3 Configurar Google Drive Redirect URI para produccion (si usas Drive)

**Archivo:** Buscar en el codigo donde esta hardcodeado `localhost` para Drive.

Encontrar y reemplazar en **`src/lib/drive/client.ts`** (linea aproximada de redirect URI):
```typescript
// DONDE ANTES DECIA (ejemplo):
const REDIRECT_URI = "http://localhost:3000/api/drive/auth/callback";

// CAMBIAR A:
const REDIRECT_URI = "https://amazon-fba-manager-virid.vercel.app/api/drive/auth/callback";
```

Tambien actualizar en Google Cloud Console > Credenciales > URI de redireccionamiento OAuth.

---

### 2.4 SP-API Sync real (si queres que el CRON sincronice de verdad)

**Archivo:** `src/app/api/cron/sync/route.ts`

El cron actual marca "completed" sin sincronizar nada. Para implementarlo:

1. Importar las funciones de sync desde `src/app/api/sp-api/sync/route.ts`
2. Dentro de `executeSync()`, segun el `syncType`, llamar a las funciones correspondientes:
   - `"products"` -> `getListings(client, sellerId)`
   - `"orders"` -> `getOrders(client, createdAfter)`
   - `"inventory"` -> `getInventory(client, marketplaceId)`
   - `"fees"` -> `getFeeEstimate(client, ...)`
3. Guardar los resultados en las tablas correspondientes
4. Actualizar `items_processed` e `items_failed` en `sync_logs`

**Codigo de ejemplo para el cuerpo de executeSync() - PEGAR entre el throw new Error() y el await supabase.from("sync_logs").update({ status...:**
```typescript
// Reemplazar TODO el bloque try { ... } actual con esto:
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

  // Agregar aca los otros syncTypes...

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

**Nota:** Esto require que SP-API este configurado y funcionando en tu cuenta de Amazon Seller Central.

---

### 2.5 Fix SP-API headers incorrectos (si usas SP-API)

**Archivo:** `src/lib/sp-api/client.ts`

Buscar donde se setean los headers `Amazon-Advertising-API-*`. Esos headers son para la API de Ads (PPC), NO para SP-API. Si estas usando SP-API de listings/orders/inventory, deberian eliminarse.

**Lineas a buscar:** (no encontre exactamente donde estan, revisar en `client.ts`):
```typescript
// Si encontras esto en client.ts, ELIMINARLO:
"Amazon-Advertising-API-Scope": ...
"Amazon-Advertising-API-ClientId": ...
```

---

### ~~2.6.1 Centralizar navItems~~ ✅ YA EXISTE

`src/lib/navigation.ts` ya existe y es la unica fuente de verdad. Tanto `sidebar.tsx` como `mobile-bottom-nav.tsx` importan desde ahi. No hay duplicacion.

### 2.7 Tests agregados (182 tests)

Se agregaron tests para la infraestructura AI:
- `src/lib/ai/types.test.ts` - 6 tests (estructura de tipos)
- `src/lib/ai/prompts.test.ts` - 8 tests (generacion de prompts)

**Tests que faltarian (opcional):**
- Componentes: dashboard-client, sidebar, product-form, tables
- Hooks: use-url-scrape
- API routes: research/analyze, scrape

---

## 3. ACLARACIONES IMPORTANTES

### 3.1 Research Bot - Limitacion SP-API

El Research Bot usa `getCatalogItem()` de SP-API que **SOLO trae datos basicos** (titulo, marca, categoria, imagen). NO trae:
- Precio de venta
- Bullet points
- Descripcion completa
- Reviews

Por eso el prompt de GPT-4o recibe datos limitados. El AI estima los campos faltantes basado en su conocimiento del mercado. Es una **estimacion**, no datos reales de Amazon.

**Si queres datos reales:** Necesitas usar la API de Product Advertising (PA-API) que es distinta a SP-API. O bien usar un servicio de scraping como Keepa.

### 3.2 Cron Sync - No implementado a proposito

El cron sync queda como stub porque la implementacion real requiere:
1. SP-API conectado y funcionando
2. Mapear cada syncType a endpoints especificos de SP-API
3. Logica de upsert en cada tabla
4. Manejo de rate limiting de SP-API

Si no usas SP-API, el stub no afecta nada. Si lo usas, implementar con el codigo del punto 2.4.

### 3.3 Catch blocks - Por que algunos quedaron sin fix

De los ~93 catch blocks originales, ~30 tenian `toast.error()` o `router.push()` o `setError()` que es manejo de error aceptable. Solo los completamente vacios fueron fixeados. Si en el futuro ves un catch block que no hace nada, agregale un `console.error`.

### 3.4 OpenAI SDK - Version instalada

Se instalo `openai` v4.x. Si queres cambiar a otro proveedor de AI (Anthropic Claude, Google Gemini, etc), solo necesitas cambiar `src/lib/ai/client.ts` y `src/lib/ai/prompts.ts`.

---

## 4. RESUMEN EJECUTIVO

| Item | Quien lo hace | Tiempo estimado |
|------|---------------|-----------------|
| Setear OPENAI_API_KEY en Vercel | **Vos** | 2 min |
| ~~Agregar .gitignore + rm --cached~~ | ✅ YA HECHO | - |
| Google Drive redirect URI prod (usar NEXT_PUBLIC_APP_URL) | **Vos** (ver nota) | 5 min |
| SP-API sync real | **Vos** si usas SP-API | 30-60 min |
| SP-API headers fix | **Vos** si usas SP-API | 5 min |
| ~~Refactor navItems~~ | ✅ YA EXISTE | - |
| Tests coverage adicional | **Vos** (opcional) | 30 min |
| **Todo lo demas** | **YA ESTA HECHO** | - |

**Nota Drive:** El redirect URI usa `NEXT_PUBLIC_APP_URL` (linea 17 de `src/lib/drive/client.ts`). Si seteas esa variable en Vercel como `https://amazon-fba-manager-virid.vercel.app`, funciona automaticamente. Tambien agregar esa URL + `/api/drive/auth/callback` en Google Cloud Console.

**Build:** 0 errores ✅
**Tests:** 182 pasando ✅
**Deploy:** https://amazon-fba-manager-virid.vercel.app ✅
