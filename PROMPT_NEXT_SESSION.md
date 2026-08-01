# PROMPT_NEXT_SESSION — Checkpoint

---

## Ultima sesion

- **Fecha**: 2026-08-01
- **Resumen**: La extension fue reconstruida como **recolector multi-fuente** para resolver "no me toma datos, nunca pone nicho":
  - **Diagnostico**: BSR/ventas/nicho NO estan en el DOM de resultados de busqueda de Amazon — solo en overlays (Xray completo de H10) o pagina del producto. Con H10 free no se detectaba el overlay. Los `niche`/`amazon_category` de la app solo los produce el LLM (deep dive, bloqueado por creditos xAI)
  - **Fix**: `content/overlay-reader.ts` (lector generico por ASIN) + `content/sources.ts` (deteccion H10/AMZScout/Keepa + debug) + `content/content.ts` reescrito (merge por ASIN, prioridad h10>amzscout>keepa, observer) + `scraper.ts` arreglado (titulo real `h2 a span`, dedupe `[data-asin]` anidados, moneda detectada) + **tool de debug en popup** (boton "Debug overlays" → copia HTML)
  - **Estado**: exteRB regenerada, tsc 0, lint solo warnings pre-existentes, 217 tests OK. **Pendiente: DOM real de AMZScout/Keepa** para afinar selectores (usuario los tiene instalados free)
- Ver `Daily Notes/2026-08-01.md` (4ta parte) para el detalle completo

## Estado actual

Leer `App State.md` para el snapshot completo. Puntos clave:
- Motor de Investigacion funcional: extension -> capture -> scoring -> deep dive (LLM = xAI Grok `grok-4.5`)
- `source_data` JSONB confirmado en prod (column existe)
- **Extension = recolector multi-fuente**: overlay-reader + sources + content merge por ASIN + scraper arreglado + tool de debug. exteRB regenerada y lista para recargar. **Bloqueado por el DOM real de AMZScout/Keepa** (selectores genericos hasta ver HTML real via el tool de debug)
- **Bloqueante deep dive**: team xAI sin creditos/licencias (403). Comprar en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **XAI_API_KEY solo en .env.local** — falta agregarla en Vercel (prod) o el deep dive fallara en produccion

## Proximos pasos

### 1. USUARIO debe hacer (DESBLOQUEA el afilado de selectores)
- **Recargar la extension** en chrome://extensions (Load unpacked → `public/exteRB/`)
- **Abrir una busqueda de Amazon** con AMZScout y/o Keepa activos (overlays visibles) y correr el boton **"Debug overlays"** del popup → copiar el HTML que aparece (o el mensaje "No se detectaron overlays")
- **Pegar ese HTML en el chat** para afinar los readers de AMZScout (niche score, ventas, revenue) y Keepa (BSR)

### 2. Agente (despues de tener el DOM real)
- Afinar `overlay-reader.ts` selectores por fuente; mapear campos al capture endpoint y a `source_data` JSONB
- Test Playwright del scraper arreglado en amazon.com (titulo, dedupe, moneda)
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

- `src/chrome-extension/content/overlay-reader.ts` — NUEVO lector generico de overlays por ASIN
- `src/chrome-extension/content/sources.ts` — NUEVO deteccion H10/AMZScout/Keepa + debug html
- `src/chrome-extension/content/content.ts` — merge multi-fuente por ASIN (prioridad h10>amzscout>keepa) + observer
- `src/chrome-extension/content/scraper.ts` — titulo real, dedupe, moneda detectada
- `src/chrome-extension/popup/popup.{ts,html,css}` — tool de debug (boton + textarea copiable)
- `src/lib/ai/client.ts` — `getXAIClient()` (OpenAI SDK → xAI baseURL)
- `src/lib/research/analyzer.ts` — Grok `grok-4.5` + Zod schema con fallbacks (`.catch()`)
- `src/scripts/build-extension.ts` — build → `public/exteRB/` (sin zip)
- `src/app/api/research/capture/route.ts` — endpoint con Zod (passthrough → source_data JSONB)
- `.env.local` — XAI_API_KEY (gitignored)

## Comandos

```bash
npm run dev              # Desarrollo
npm run build            # Build produccion
npm run lint             # Linting
npm run test:run         # Tests (217)
npm run build:extension  # Regenerar exteRB (public/exteRB)
npx tsc --noEmit         # Typecheck (0 errores esperados)
```

## Vault

- [[00 - Dashboard]] — entry point del segundo cerebro
- [[App State]] — snapshot del proyecto
- [[Bugs Conocidos]] — extension pendiente + credito OpenAI
- [[Decisiones Tecnicas]] — ADRs
- [[Learning Log]] — Zod .catch(), adm-zip, patron NextRequest en mocks
