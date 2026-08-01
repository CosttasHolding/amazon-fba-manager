# PROMPT_NEXT_SESSION — Checkpoint

---

## Ultima sesion

- **Fecha**: 2026-08-01 (6ta parte)
- **Resumen**:
  - **Overlays de terceros en vivo (Playwright + chromium empaquetado + CRX oficiales)**: AMZScout y Keepa cargan junto con la extension (3 extensiones en chrome://extensions). Amazon con perfil persistente NO bloquea (42-50 cards)
  - **AMZScout sin login NO inyecta el overlay** (error `licence` null en bundle.js) — imposible capturar su HTML sin sesion real del usuario
  - **Keepa en producto inyecta iframe cross-origin** `keepa.com/keepaBox.html` (207KB); BSR/ventas adentro, detras de login — no legible por el reader
  - **HALLAZGO CLAVE: Amazon expone el BSR gratis en el DOM del producto** (`#prodDetails` → `li` con "nº722 en Electrónica" / "nº52 en Audífonos Externos"). El scraper NUNCA lo capturaba (selector `#detailBullets_feature_div` + texto "Best Sellers Rank" no matchean el DOM real)
  - **Fix TDD**: `parseBsr` (reconoce `nº|#|n°`), `parseBsrCategory`, selectores `#prodDetails li,...` — toma el BSR mas bajo (subcategoria = nicho). Verificado en vivo: `B0F12Q56RZ` → `bsr: 52`, `category: "Audífonos Externos"`
  - **Hook debug**: `publishDebugToDom()` escribe `data-fba-overlay-debug` + `data-fba-captured` en el DOM (chrome.runtime.sendMessage NO es accesible desde el main world)
  - **225/225 tests, tsc 0**. Build extension OK; copia personal sincronizada por hash

## Estado actual

Leer `App State.md` para el snapshot completo. Puntos clave:
- Motor de Investigacion funcional: extension -> capture -> scoring -> deep dive (LLM = xAI Grok `grok-4.5`)
- `source_data` JSONB confirmado en prod (column existe)
- **Extension = recolector multi-fuente**: overlay-reader + sources + content merge por ASIN + scraper arreglado + BSR/categoria del DOM de producto + tool de debug. exteRB regenerada y lista para recargar
- **El BSR/categoria del producto ya sale del DOM de Amazon (gratis, sin overlays)** — solo el nicho score/ventas/revenue de AMZScout requieren sesion real del usuario
- **Bloqueante deep dive**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **XAI_API_KEY solo en .env.local** — falta agregarla en Vercel (prod)

## Proximos pasos

### 1. USUARIO debe hacer (DESBLOQUEA el afilado de selectores de AMZScout)
- **Recargar la extension** en chrome://extensions (Load unpacked → `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` — YA SINCRONIZADA con el build; apunta a ESTA carpeta, NO a `public/exteRB`)
- **Refrescar la pestaña de Amazon** — el content script corre al cargar la pagina; sin refresh sigue mostrando los datos viejos
- **Abrir la pagina de un producto** → confirmar que "Debug overlays" muestra keepa detectado (o ver `data-fba-overlay-debug` en el DOM)
- **Si usa AMZScout LOGUEADO**: abrir una busqueda con el overlay visible y correr **"Debug overlays"** → pegar el HTML para afinar `overlay-reader.ts` (niche score, ventas, revenue)
- **Confirmar que una pagina de producto ahora captura BSR + categoria** (la UI deberia mostrar el nicho sin depender del LLM)

### 2. Agente (despues de tener el DOM real de AMZScout)
- Afinar `overlay-reader.ts` selectores de AMZScout (niche score, ventas, revenue); mapear campos al capture endpoint y a `source_data` JSONB
- Decidir si el BSR/categoria del producto se muestra en la UI del research (vista producto) y/o se usa para scoring sin LLM
- Test Playwright del scraper arreglado (titulo, dedupe, moneda, BSR de producto) en amazon.com
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
