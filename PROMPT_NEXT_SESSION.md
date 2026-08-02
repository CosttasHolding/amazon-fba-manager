# PROMPT_NEXT_SESSION — Checkpoint

---

## Ultima sesion

- **Fecha**: 2026-08-01 (8va parte)
- **Resumen**:
  - **Boton `🔄 Reload` en el popup** (`chrome.tabs.reload` + `chrome.runtime.reload`): recarga pestana + extension desde disco sin ir a chrome://extensions. No requiere permisos nuevos
  - **Fixes del scraper de busqueda verificados en vivo** (Playwright + chromium empaquetado): titulo real en cards de anuncios (anti-badge "Deja un comentario sobre el anuncio"), dedupe por ASIN (anuncio + organico), `review_count` desde `a[aria-label*="valoraciones"]` o `(92.9 K)` (formato K), `brand` en producto (`#bylineInfo` / `tr.po-brand`)
  - **Mode honesto**: `mode: h10_xray` y `sources` solo reflejan overlays que realmente aportaron datos (`readOverlay().length > 0`) — H10 sin login ya no miente
  - **233/233 tests, tsc 0**. Build extension OK (content.js 8.5KB); copia personal sincronizada por hash
  - **Verificado en vivo**: SEARCH → 22 productos con titulo real, price/currency ARS, review_count, rating, image; PRODUCTO (B0DNVLW5MC) → bsr=72, category=Audífonos Externos, brand=Wentronic

## Estado actual

Leer `App State.md` para el snapshot completo. Puntos clave:
- Motor de Investigacion funcional: extension -> capture -> scoring -> deep dive (LLM = xAI Grok `grok-4.5`)
- `source_data` JSONB confirmado en prod (column existe)
- **Extension = recolector multi-fuente**: overlay-reader + sources + content merge por ASIN + scraper arreglado + BSR/categoria/brand del DOM de producto + boton Reload + tool de debug. exteRB regenerada y lista para recargar
- **El BSR/categoria/brand del producto ya sale del DOM de Amazon (gratis, sin overlays)** — solo el nicho score/ventas/revenue de AMZScout requieren sesion real del usuario
- **Bloqueante deep dive**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **XAI_API_KEY solo en .env.local** — falta agregarla en Vercel (prod)

## Proximos pasos

### 1. USUARIO debe hacer (DESBLOQUEA el afilado de selectores de AMZScout)
- **Usar el boton `🔄 Reload` del popup** (recarga pestana de Amazon + extension desde disco) en vez de ir a chrome://extensions — la copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` YA esta sincronizada con el build (hash)
- **Si usa AMZScout/H10 LOGUEADOS**: abrir una busqueda con el overlay visible y correr **"Debug overlays"** → pegar el HTML real (ahora incluye shadow roots) para afinar `overlay-reader.ts` (niche score, ventas, revenue)
- **Confirmar que una pagina de producto captura BSR + categoria + brand** (la UI deberia mostrar el nicho sin depender del LLM)

### 2. Agente (despues de tener el DOM real de AMZScout)
- Afinar `overlay-reader.ts` selectores de AMZScout (niche score, ventas, revenue) y lectura dentro del shadowRoot; mapear campos al capture endpoint y a `source_data` JSONB
- Decidir si el BSR/categoria/brand del producto se muestra en la UI del research (vista producto) y/o se usa para scoring sin LLM
- Probar el ENVIO: fetch del popup a `/api/research/capture` con `credentials: "include"` y cookie `SameSite=Lax` (posible 401)
- Rebuild + verificacion por fase (tsc/lint/test:run/build)

### 3. Usuario — pendientes de sesiones anteriores
- **Cargar creditos/licencias xAI** — sin esto el deep dive tira 403 (https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c)
- **Agregar XAI_API_KEY en Vercel** (Settings → Environment Variables)
- **Rotar las API keys AL CARGAR CREDITOS** — decision tomada (riesgo bajo hoy, keys sin creditos)
- El `.pem` de firma de la extension esta movido fuera del repo (copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\`)

### 4. Backlog (MEDIUM)
- Zod validation en SP-API / Drive / Cron routes
- N+1 queries fix + dashboard limits
- Accessibility fixes
- Deuda i18n: `product-analyzer.tsx` (Research Bot, strings hardcodeadas)
- Unificar numeros duplicados de migraciones 014/015 (LOW)

## Archivos clave

- `src/chrome-extension/content/scraper.ts` — **BSR + categoria del DOM de producto (`#prodDetails` `nºN en X`)**, titulo real, dedupe, moneda
- `src/chrome-extension/content/content.ts` — merge multi-fuente + `publishDebugToDom()` (data-fba-overlay-debug / data-fba-captured)
- `src/chrome-extension/content/overlay-reader.ts` — lector generico de overlays por ASIN (pendiente afinar con DOM real de AMZScout)
- `src/chrome-extension/content/sources.ts` — deteccion H10/AMZScout/Keepa + debug html
- `src/chrome-extension/popup/popup.{ts,html,css}` — tool de debug (boton + textarea copiable)
- `src/lib/ai/client.ts` — `getXAIClient()` (OpenAI SDK → xAI baseURL)
- `src/lib/research/analyzer.ts` — Grok `grok-4.5` + Zod schema con fallbacks (`.catch()`)
- `src/scripts/build-extension.ts` — build → `public/exteRB/` (sin zip)
- `src/app/api/research/capture/route.ts` — endpoint con Zod (passthrough → source_data JSONB)
- `.env.local` — XAI_API_KEY (gitignored)
- Temp (fuera de repo): `C:\Users\Nacho\AppData\Local\Temp\opencode\` → `get_crx.py`, `live_capture.py`, `bsr_html.py`, `verify_bsr.py`, `ext-src\{amzscout,keepa}` (CRX oficiales extraidos), `pw7-profile` (perfil persistente que evita el anti-bot)

## Comandos

```bash
npm run dev              # Desarrollo
npm run build            # Build produccion
npm run lint             # Linting
npm run test:run         # Tests (225)
npm run build:extension  # Regenerar exteRB (public/exteRB)
npx tsc --noEmit         # Typecheck (0 errores esperados)
```

## Vault

- [[00 - Dashboard]] — entry point del segundo cerebro
- [[App State]] — snapshot del proyecto
- [[Bugs Conocidos]] — extension pendiente + credito OpenAI
- [[Decisiones Tecnicas]] — ADRs
- [[Learning Log]] — Zod .catch(), adm-zip, patron NextRequest en mocks
