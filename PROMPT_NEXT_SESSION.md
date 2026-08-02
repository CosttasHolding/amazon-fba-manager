# PROMPT_NEXT_SESSION — Checkpoint

---

## Ultima sesion

- **Fecha**: 2026-08-01 (9na parte)
- **Resumen**:
  - **HTML real de H10 capturado por el usuario** (widget `#h10-product-score`, summary de producto): BSR `#28 Action Figures` + `#1,240 Toys & Games`, Listing Health Score `6.9`, Unit Sales/Rating N/A (plan free). Keepa = iframe cross-origin ilegible
  - **NUEVO `readH10Summary()`** en overlay-reader: ASIN + BSR/categoria (links bestsellers, BSR mas bajo) + `listing_health_score` (campo nuevo) + Unit Sales / Current Rating; lee desde el **shadow root** (estructura real de H10); parseo numerico unificado (1,240 → 1240)
  - **238/238 tests, tsc 0**. Build extension OK; copia personal sincronizada por hash
  - **Verificado en vivo**: amazon.com/dp/B0GZYR5LJF + HTML real inyectado en shadow root → bsr 28, category Figuras de Acción, listing_health_score 6.9, mode h10_xray

## Estado actual

Leer `App State.md` para el snapshot completo. Puntos clave:
- Motor de Investigacion funcional: extension -> capture -> scoring -> deep dive (LLM = xAI Grok `grok-4.5`)
- `source_data` JSONB confirmado en prod (column existe)
- **Extension = recolector multi-fuente**: overlay-reader (H10 summary + generico) + sources + content merge por ASIN + scraper arreglado (BSR/categoria/brand del DOM) + boton Reload + tool de debug. exteRB regenerada y lista para recargar
- **BSR/categoria/brand/listing_health_score ya salen del DOM de Amazon + widget H10 (gratis)** — solo nicho score/ventas/revenue de AMZScout requieren sesion real del usuario
- **Bloqueante deep dive**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **XAI_API_KEY solo en .env.local** — falta agregarla en Vercel (prod)

## Proximos pasos

### 1. USUARIO debe hacer (DESBLOQUEA el afilado de selectores de AMZScout)
- **Usar el boton `🔄 Reload` del popup** (recarga pestana + extension desde disco); la copia personal `C:\Users\Nacho\Desktop\Amazon\IMPORTANTE\exteRB\` YA esta sincronizada (hash)
- **Abrir un producto con H10 visible** → la captura deberia incluir `listing_health_score` y BSR/categoria (verificar en "Debug overlays")
- **Si usa AMZScout LOGUEADO**: abrir una busqueda con el overlay visible y correr **"Debug overlays"** → pegar el HTML real de la tabla (nicho score, ventas, revenue) para afinar `overlay-reader.ts`
- **Probar el ENVIO**: boton para guardar desde el popup → `/api/research/capture` (posible 401 por cookie SameSite=Lax)

### 2. Agente (despues de tener el DOM real de AMZScout)
- Afinar `readOverlay`/`readH10Summary` selectores de AMZScout (niche score, ventas, revenue) y mapear a `source_data` JSONB
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
