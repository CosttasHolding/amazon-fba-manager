# PROMPT_NEXT_SESSION — Checkpoint

---

## Ultima sesion

- **Fecha**: 2026-08-01 (13va parte)
- **Resumen**:
  - **Bug "capturo muchisimos productos" — ROOT CAUSE**: el panel de AMZScout (`as-pro-container`) tiene SIEMPRE dos zonas — header con totals (`Results`, Avg. Mo Sales/Revenue/Rank/Price/Margin) + tabla `.maintable__row-wrapper .maintable__row` que **en la pagina de producto se llena con los productos similares del nicho**. `readAMZScout` priorizaba la tabla y devolvia TODAS las filas. El fix del fingerprint (12va parte) expuso el bug: el observer re-colecta cuando la tabla del nicho se llena → capturaba todos
  - **Fix**: `readAMZScout` con `fallbackAsin` (pagina de producto): (1) devuelve SOLO la fila del ASIN abierto si esta en la tabla; (2) si no, usa los totals SOLO si `Results <= 1`; si `Results > 1` → `[]` (totals = promedio del NICHO). Busqueda sigue capturando la tabla completa
  - **247/247 tests, tsc 0**. Build extension OK (content.js 13.5KB); copia personal sincronizada por hash
  - **Parte 12va**: fix "solo envia h10" — observer re-colecta cuando cambia el fingerprint de contenido (AMZScout llena su host async)
  - **Parte 11va**: `readAMZScout()` con HTML real del usuario — tabla de busqueda (`.maintable__row .scout-col.*`) + totals del header aplicados al ASIN de la pagina; campo `net_margin_percent`; popup muestra Ventas/m + Revenue/m + Margen
  - **Parte 10ma**: deteccion de AMZScout via tag name `amzscout-pro` (custom element como primer hijo de `<html>`)

## Estado actual

Leer `App State.md` para el snapshot completo. Puntos clave:
- Motor de Investigacion funcional: extension -> capture -> scoring -> deep dive (LLM = xAI Grok `grok-4.5`)
- `source_data` JSONB confirmado en prod (column existe)
- **Extension = recolector multi-fuente**: overlay-reader (H10 summary + generico) + sources (deteccion incluye `<amzscout-pro>`) + content merge por ASIN + scraper (BSR/categoria/brand del DOM) + boton Reload + tool de debug
- **BSR/categoria/brand/listing_health_score ya salen del DOM de Amazon + widget H10 (gratis)** — solo nicho score/ventas/revenue de AMZScout requieren sesion real del usuario
- **Bloqueante deep dive**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **XAI_API_KEY solo en .env.local** — falta agregarla en Vercel (prod)

## Proximos pasos

### 1. USUARIO debe hacer (verificar el fix de "muchisimos productos")
- **Usar el boton `🔄 Reload` del popup** (recarga pestana + extension desde disco); la copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` YA esta sincronizada (hash)
- **Abrir un producto con AMZScout logueado, ESPERAR a que cargue** → el popup deberia mostrar **1 solo producto** (el abierto) con sus datos de AMZScout (Ventas/m + Revenue/m + Margen) si su ASIN esta en la tabla del nicho o si Results=1
- **Enviar** → verificar que `/api/research/capture` recibe el ASIN correcto con ventas/revenue/margen + datos de H10

### 2. Agente (despues de tener el DOM real de AMZScout)
- Afinar `readOverlay` selectores de AMZScout (niche score, ventas, revenue) y mapear a `source_data` JSONB
- Decidir si BSR/categoria/listing_health_score se muestran en la UI del research y/o se usan para scoring sin LLM
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
npm run test:run         # Tests (247)
npm run build:extension  # Regenerar exteRB (public/exteRB)
npx tsc --noEmit         # Typecheck (0 errores esperados)
```

## Vault

- [[00 - Dashboard]] — entry point del segundo cerebro
- [[App State]] — snapshot del proyecto
- [[Bugs Conocidos]] — extension pendiente + credito OpenAI
- [[Decisiones Tecnicas]] — ADRs
- [[Learning Log]] — Zod .catch(), adm-zip, patron NextRequest en mocks
