---
tipo: tracking
tags: [bug, problemas]
ultima_actualizacion: 2026-08-07
---

# Bugs Conocidos

> Lista de bugs pendientes o resueltos.

---

## Activos

### Share deshabilitado por hallazgo M1
- **Fecha**: 2026-08-23
- **Estado**: DESHABILITADO OPERACIONALMENTE
- **Síntoma**: el feature de links compartidos podía exponer datos mediante tokens públicos y usaba `service_role` para leer datos tenant-scoped.
- **Mitigación**: `/api/share`, `/api/share/[token]` y `/share/[token]` devuelven error sin consultar datos; la entrada de Share fue retirada de Analytics. Se conserva el código y la tabla para una futura corrección estructural.
- **Pendiente para reactivar**: diseño seguro de tokens (hash, expiración obligatoria, revocación), rate limit público y regression tests cross-tenant.

### Drive OAuth pendiente
- **Fecha**: 2026-08-23
- **Estado**: migración local org-scoped pendiente de verificación y checkpoint externo
- **Motivo histórico**: la configuración legacy con service account no tenía cuota de almacenamiento. El flujo actual usa una conexión OAuth cifrada por organización.
- **Progreso**: código local con `drive_connections`, estado OAuth hashado, containment por raíz y UI read-only.
- **Verificado localmente**: suite Drive, typecheck, lint sin errores, tests globales, build y reviews independientes.
- **Pendiente de verificación**: integración tenant real en staging, que requiere credenciales y opt-in explícito.
- **Pendiente owner**: aplicar migraciones 057/058 en staging o producción, configurar roots por organización y ejecutar E2E con las cuentas autorizadas.
- **Regla**: nunca pegar client secrets, refresh tokens ni credenciales en el chat; deben permanecer en `.env.local` o el gestor de secretos de producción.

### Deep dive falla por falta de creditos/licencias en xAI (BLOQUEADO)
- **Fecha**: 2026-08-01
- **Sintoma**: `/api/research/analyze-deep` y `/api/research/analyze` devuelven `403 Your newly created team doesn't have any credits or licenses yet`
- **Causa**: la key `XAI_API_KEY` es VALIDA (autenticacion OK, llega a api.x.ai) pero el team no tiene creditos/licencias cargadas
- **Solucion**: comprar creditos en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **Adicional**: XAI_API_KEY solo esta en `.env.local` — falta agregarla en Vercel (prod) o el deep dive fallara en produccion
- **Seguridad**: las keys de OpenAI y xAI quedaron expuestas en el chat del 2026-08-01. **RESUELTO 2026-08-05**: el usuario confirmo que las roto

### Score no se recalculaba al editar el producto manualmente → RESUELTO (2026-08-04)
- **Fecha**: 2026-08-03 / resuelto 2026-08-04
- **Sintoma**: el score de captura quedaba "stale" — si se editaban ventas/precio/BSR desde el modal de edicion (o via `POST /api/research` del analyzer/deep dive), la columna `score` y `score_details` no se recalculaban y la card mostraba un score que ya no reflejaba los datos editados
- **Causa**: `calculateScore()` solo se invocaba en `POST /api/research/capture`. `PUT /api/research` y `POST /api/research` (rutas de edicion) no lo tocaban
- **Fix (2026-08-04)**: helper puro `src/lib/research/recompute.ts` (`toScoringInputFromRow` mergea columnas + `source_data` para revenue/fba_fee/seller_count, `rowHasData` gate, `recomputeScoreForRow`); `PUT` y `POST /api/research` recalculan `score` + `score_details` + derivan o respetan `competition_level` (**override manual respetado**); status-only (`{ status }`) no toca score; PUT 404 si fila no existe. Migracion `032` agrego las columnas de metricas. Commits `60ac69b`
- **Verificacion**: tsc 0 | 300/300 tests | build OK | migraciones 030/031/032/033 aplicadas en prod

---

## Resueltos

### Página de prod sin hidratar: CSP bloqueaba todos los scripts inline → RESUELTO (2026-08-22)
- **Fecha**: reportado 2026-08-22 / resuelto 2026-08-22
- **Síntoma**: "no anda la pagina" en prod; consola Chrome: `Executing inline script violates ... script-src 'self' 'strict-dynamic' 'nonce-...' 'unsafe-inline'. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present`
- **Causa raíz**: el middleware (`src/middleware.ts`) generaba el nonce y lo ponía SOLO en los headers de **respuesta**. Next.js necesita la CSP/nonce también en los headers de **request** (`NextResponse.next({ request: { headers } })`, patrón oficial de la doc) para estampar el nonce en sus bootstrap scripts. Además el layout raíz no leía el nonce ni forzaba render dinámico → `/login` se servía estática/cacheada. Resultado: 0 atributos `nonce=` en el HTML servido + header exigiendo nonce con `strict-dynamic` (que ignora `'self'` y `'unsafe-inline'` para scripts) → TODOS los scripts bloqueados → React nunca hidrataba
- **Bug latente desde 2026-07-28** (`4864e85`, CSP hardening): en dev la CSP es `'unsafe-inline'` sin nonce → nunca se vio; las verificaciones de prod previas fueron HTTP/API-level (status 200, PostgREST, capturas del extension directo a API) que no ejercitan hidratación
- **Fix (2026-08-22, commit `58e8e3b`)**: middleware reenvía `x-nonce` + `content-security-policy` en request headers; `updateSession(request, requestHeaders?)` los usa al crear la respuesta; layout raíz consume `headers().get("x-nonce")` para forzar render dinámico global (necesario: nonce por-request es incompatible con HTML cacheado)
- **Verificación**: RED→GREEN local con build prod (antes: 8 inline/0 nonce; después: 28 nonces, match header==HTML) | tsc 0 | lint OK | 391/391 tests | build OK | prod post-deploy: 27 nonces, match True | **E2E usuario confirmado**

### Categoria del producto se completaba con la del producto en vista (no la de Amazon) → RESUELTO (2026-08-07)
- **Fecha**: reportado 2026-08-07 / resuelto 2026-08-07
- **Sintoma**: en el form de producto (nuevo/editar/modal), el campo categoria se completaba con la categoria del producto en vista, no con la categoria scrapeada de Amazon
- **Causa raiz**: el scraper extrae la categoria real del breadcrumb de Amazon (ej. "Home & Kitchen", "Sports & Outdoors", "Cell Phones & Accessories") pero los `catMap` hardcodeados en `product-form-modal.tsx` y `products/new/page.tsx` usaban **matching exacto** (`catMap[data.category.toLowerCase()]`) → las categorias reales de Amazon nunca matcheaban → el valor se descartaba → el campo conservaba la categoria previa del producto en vista
- **Fix (2026-08-07)**: nuevo helper `src/lib/scraping/category.ts` (`mapAmazonCategory`, matching por subcadena/keywords robusto a las 9 categorias internas) usado en ambos flujos en lugar del catMap duplicado. TDD: 3 tests (mapeo exacto, por subcadena, no reconocidas)
- **Verificacion**: 308/308 tests | tsc 0 | lint solo warnings pre-existentes | build OK. **Pendiente**: push

### niche_score no se capturaba en pagina de producto (extension AMZScout) → RESUELTO (2026-08-07)
- **Fecha**: descubierto 2026-08-07 / resuelto 2026-08-07
- **Sintoma**: `source_data.niche_score` era null en las 3 capturas reales con score; 0/68 filas con niche_score. La feature de competencia 5 niveles dependia del Niche Score de los totals de AMZScout
- **Causa raiz**: en pagina de producto con AMZScout logueado, la tabla del nicho SI contiene el ASIN abierto → `readAMZScout` con `fallbackAsin` devolvia esa fila via `readAmzscoutTable` (overlay-reader.ts:293), que **no parsea `niche_score`** (solo `.col-sales/.col-revenue/.col-mi/.col-rank/.col-sellers/etc.`). Los totals del header (donde vive "Niche Score", leido por `readAmzscoutTotals`:288) solo se leian cuando el ASIN NO esta en la tabla y `Results <= 1`. El parser de totals SI funcionaba (test → 72); el problema era que esa ruta no corre en el caso real mas comun
- **Evidencia**: capturas reales B016NE9A2A (mo_sales 5840, revenue 153310, margin 65, bsr 6, sellers 2) y B0H38PWZKR (mo_sales 2041, revenue 153061, margin 79, bsr 62, sellers 1) — valores de columnas de la tabla del nicho, no de totals
- **Fix (2026-08-07)**: en `readAMZScout`, cuando hay match en la tabla con fallbackAsin, mergea `niche_score` desde `readAmzscoutTotals` (solo ese campo, del nicho). TDD: test RED primero (fixture tabla+totals, `AMZSCOUT_TABLE_WITH_TOTALS_HTML`), luego GREEN. Rebuild extension + sync `exteRB`
- **Verificacion**: 305/305 tests | tsc 0 | lint solo warnings pre-existentes | build OK | build:extension OK. **Pendiente**: push + deploy + E2E con una captura nueva para ver niche_score poblado

### Verificacion E2E: competencia 5 niveles + Niche Score → HECHA (2026-08-05, confirmada 08-07)
- **Estado**: RESUELTA. El E2E con AMZScout logueado se hizo y quedo confirmado con datos reales en prod
- **Evidencia (2026-08-07, lectura PostgREST)**: 2 capturas AMZScout reales del 2026-08-05 — `B016NE9A2A` Foam Roller (score 85, competition_level=low, niche="Foam Rollers", mo_sales 5840, amazon_url auto) y `B0H38PWZKR` Jujutsu Kaisen (score 86, comp=low, niche="Action Figures", mo_sales 2041, amazon_url auto). Migraciones 031/032/033 todas aplicadas en prod
- **Matiz**: el **Niche Score** de los totals NO se capturo (ver bug activo `niche_score`). La competencia salio "low" derivada del scoring, no del Niche Score. El badge de competencia y el score funcionaron igual

### Capture fallaria en prod si la migracion 033 no estaba aplicada (2026-08-04)
- **Fecha**: 2026-08-04
- **Sintoma**: tras pushear la feature de URLs (commit `e483b48`), la capture route inserta `amazon_url`/`alibaba_url` pero la migracion `033` no se habia aplicado aun en prod
- **Causa**: orden code-antes-que-db. El deploy a Vercel llego primero; la tabla no tenia las columnas nuevas
- **Solucion**: verificar contra prod con PostgREST (select de cada columna → 42703 si falta) antes de dar la feature por lista; el usuario aplico la migracion y se re-verifico OK
- **Leccion**: al agregar columnas nuevas, aplicar la migracion en prod ANTES o a la par del deploy del codigo que las usa

### La captura traia muchisimos productos: AMZScout tomaba la tabla del nicho en la pagina de producto
- **Fecha**: 2026-08-01 (13va parte)
- **Sintoma**: "me capturo datos de muchisimos productos no solo el que tenia en la pagina abierta" — al enviar desde una pagina de producto con AMZScout logueado, llegaban todos los productos similares del nicho, no solo el ASIN abierto
- **Causa raiz**: el panel `as-pro-container` de AMZScout tiene SIEMPRE dos zonas — el header con los totals (`.totals-item`: Results, Avg. Mo Sales, Revenue, Rank, Price, Margin) y la tabla `.maintable__row-wrapper .maintable__row`. **En la pagina de producto esa tabla se llena con los productos similares del nicho** (bundle: "You will see similar items currently sold on Amazon that represent a 'niche'"). `readAMZScout` priorizaba la tabla → si habia filas devolvia TODAS. El fix del fingerprint (12va parte) EXPUSO el bug latente: antes el collect inicial veia la tabla vacia → caia a totals (1 producto); ahora el observer re-colecta cuando la tabla del nicho se llena → capturaba todos los similares
- **Fix**: `readAMZScout` en `overlay-reader.ts` — si hay `fallbackAsin` (pagina de producto): (1) si el ASIN abierto esta en la tabla, devuelve SOLO esa fila; (2) si no esta, usa los totals del header SOLO si `Results <= 1`; si `Results > 1` devuelve `[]` (los totals son promedio del NICHO, no del producto). Sin `fallbackAsin` (busqueda) → tabla completa como antes
- **Test**: +3 tests en `overlay-reader.test.ts` (RED primero) con fixture de tabla del nicho (Results:2 + 2 filas). 247/247
- **Resultado**: en la pagina de producto se captura solo el ASIN abierto. Pendiente verificacion E2E del usuario (boton Reload + F5 + abrir producto)

### Al enviar desde el popup solo llegaba lo de H10, no los totals de AMZScout
- **Fecha**: 2026-08-01 (12va parte)
- **Sintoma**: el usuario reporto "envia si pero solo lo de h10" — el debug del popup mostraba el HTML de AMZScout con los totals (Ventas/m, Revenue, Margen) pero el capture llegaba sin esos datos
- **Causa raiz**: **timing**. AMZScout inserta su host `<amzscout-pro>` VACIO a document_start y Angular lo llena DESPUES (fetch + render async de los totals). El `collect()` inicial veia el host vacio → `readAMZScout` devolvia `[]` → `sources: ["h10"]`. El MutationObserver de `content.ts` solo re-disparaba cuando `keys !== lastOverlayKeys` — como la key "amzscout" ya existia desde el inicio, cuando Angular llenaba los totals NO habia cambio de keys → nunca se re-colectaba. El debug (corrido despues, con totals renderizados) mostraba el HTML completo → por eso el usuario veia los datos en debug pero no en el envio
- **Fix**: `overlayContentFingerprint()` en `sources.ts` (key + length del textContent de cada overlay detectado); `content.ts` re-colecta si cambian las keys O el fingerprint (`keys !== lastOverlayKeys || fingerprint !== lastOverlayFingerprint`) — ahora cuando AMZScout pinta los totals, el observer re-colecta y captura los datos
- **Test**: +1 test en `sources.test.ts` (RED primero: fingerprint cambia cuando un overlay se llena). 244/244
- **Resultado**: la captura ahora re-colecta al llenarse el overlay async. Pendiente verificacion E2E del usuario (boton Reload + F5 + esperar a que carguen los totals + enviar)


### AMZScout no se detectaba en "Debug overlays" (custom element `<amzscout-pro>`)
- **Fecha**: 2026-08-01 (10ma parte)
- **Sintoma**: el usuario tenia el overlay de AMZScout visible pero "Debug overlays" mostraba solo H10 y Keepa
- **Causa raiz**: AMZScout (bundle.js, corre a document_start) inserta un **custom element `<amzscout-pro>`** como primer hijo de `<html>` (`document.createElement("amzscout-pro")`, host Angular, DOM plano sin shadow root). Nuestros selectores buscaban `[id*="amzscout"]` / `[class*="amzscout"]` — matchean ATRIBUTOS id/class, no el TAG NAME del custom element
- **Fix**: selector de tag `amzscout-pro` al inicio de los selectores de amzscout en `sources.ts`; `MutationObserver` ahora observa `document.documentElement` (el host se inserta como hijo de `<html>`, no del body) en `content.ts`
- **Test**: +1 test en `sources.test.ts` (RED primero: crea `<amzscout-pro>` y verifica deteccion). 239/239
- **Resultado**: la deteccion ahora matchea el host real de AMZScout. Los DATOS del overlay (nicho score/ventas/revenue) requieren sesion/plan de AMZScout — reader pendiente de afinar con el HTML real

### Overlay de H10 no se leia: shadow DOM + classnames hash + numeros mal parseados
- **Fecha**: 2026-08-01 (9na parte)
- **Sintoma**: el HTML real del widget `#h10-product-score` (Product Summary for X) no producia datos: `readOverlay` busca filas con ASIN y el summary no las tiene; ademas el contenido vive dentro de un shadowRoot y los classnames son hash (sc-*)
- **Causa raiz**: (a) el summary es un widget de producto individual, no una tabla; (b) el `textContent`/`querySelectorAll` del host no atraviesa el shadow root; (c) `parseLocalizedNumber` de overlay-reader asumia coma=decimal ("1,240" → 1.24); (d) `valueNearLabel` no encontraba el valor cuando label y valor estaban separados con texto largo
- **Fix**: `readH10Summary()` (ASIN de "Product Summary for", BSR/categoria de links bestsellers con BSR mas bajo, listing_health_score de label "Listing Health Score"); `shadowRootOf()` para leer desde el shadow root; parseo numerico unificado con scraper; `valueNearLabel` busca label exacto + numero hoja en 3 ancestros
- **Resultado**: `listing_health_score: 6.9` + BSR/categoria capturados en vivo; ventas/rating quedan N/A en plan free (detras de Platinum)

### Scraper de busqueda: titulo "Deja un comentario sobre el anuncio" + duplicados + review_count null
- **Fecha**: 2026-08-01 (8va parte)
- **Sintoma**: (a) los productos de anuncios (`AdHolder`) salian con titulo "Deja un comentario sobre el anuncio"; (b) el mismo ASIN aparecia duplicado (anuncio + organico); (c) `review_count` siempre null en busqueda
- **Causa raiz**: (a) el selector `h2 a span` matcheaba el badge del anuncio antes que el titulo real; (b) no habia dedupe por ASIN entre cards; (c) el count real esta en `a[aria-label*="valoraciones"]` ("92,984 valoraciones") o texto `(92.9 K)` (formato abreviado con K), no en el hermano del rating
- **Fix**: `extractRealTitle()` filtra candidatos por `BADGE_PATTERNS` (elige el primer titulo >=10 chars); dedupe por ASIN priorizando el titulo real; `parseCountWithK()` (K → x1000) + selectores aria-label y `.a-size-mini.puis-normal-weight-text`
- **Adicional**: `brand` en producto desde `#bylineInfo` / `tr.po-brand`; `mode: h10_xray` solo si H10 aporto datos reales (overlays vacios ya no mienten)

### Scraper de producto nunca capturaba el BSR del DOM real de Amazon
- **Fecha**: 2026-08-01
- **Sintoma**: el `bsr` y la `category` llegaban `null` desde la pagina del producto
- **Causa raiz**: el scraper buscaba `#detailBullets_feature_div li` con texto "Best Sellers Rank"/"Clasificación", pero el DOM real (pagina en espanol) usa `#prodDetails` con `li` tipo "nº52 en Audífonos Externos" — el selector y el formato de texto no matcheaban
- **Fix**: TDD en `scraper.ts` — `parseBsr` reconoce `nº|#|n°`, `parseBsrCategory` extrae "en X"/"in X"; selectores ampliados a `#prodDetails li, #detailBullets_feature_div li, #productDetails_detailBullets_sections1 tr`; se toma el BSR mas bajo (subcategoria = nicho). Verificado en vivo: `B0F12Q56RZ` → bsr 52, categoria "Audífonos Externos"
- **Dato clave**: Amazon expone el BSR gratis en el DOM del producto — NO requiere overlays de terceros ni login

### Extension no se podia instalar: descarga servia HTML en vez del zip
- **Fecha**: 2026-07-31 (reportado) / 2026-08-01 (diagnosticado y arreglado)
- **Sintoma**: El usuario descargaba `extension.zip` desde la web y Chrome la rechazaba — "ni siquiera pude instalarla"
- **Causa raiz**: La URL de descarga era `/research/extension.zip` (archivo en `public/research/`) pero el deploy de produccion era VIEJO (anterior al commit que agrego el zip). Vercel no tenia el archivo estatico → la peticion caia al middleware → redirect a /login → el navegador descargaba la pagina HTML (16KB) con nombre `.zip` → Chrome la rechazaba
- **Evidencia**: `/LOGO.png` → 200 directo (estaticos se sirven sin auth); `/research/extension.zip` → 307 a /login (no existe el archivo en el deploy); zip commiteado en HEAD: VALIDO y trackeado → el deploy no incluia el commit
- **Fix**: zip movido a `public/extension.zip` (raiz, sin colision con rutas de app), link de descarga actualizado a `/extension.zip`, `build-extension.ts` ahora genera `public/extension.zip`. Commit `91df13f` + `dd67f31` pusheados → Vercel redeployo
- **Nota**: el middleware corre antes que los estaticos en esta app (matcher no excluye `.zip`), asi que descarga anonima da 307; un usuario logueado recibe el archivo. Verificacion E2E pendiente con el usuario (verificar que el archivo descargado sea ~5.5KB, no HTML)

### Logo no se ve en Vercel
- **Fecha**: 2026-07-22
- **Causa**: `.vercelignore` tenia `*.png` que excluia el logo
- **Solucion**: Removido `*.png` de `.vercelignore`

### Logo no carga por CSP
- **Fecha**: 2026-07-22
- **Causa**: `Cross-Origin-Embedder-Policy: credentialless` bloqueaba `next/image`
- **Solucion**: Cambiado a `<img>` nativo

### Settings no guarda
- **Fecha**: 2026-07-22
- **Causa**: API filtraba por `org_id` pero `user_settings` no tiene esa columna
- **Solucion**: Cambiado a filtro por `user_id`

### Cotizaciones no se sync entre dispositivos
- **Fecha**: 2026-07-22
- **Causa**: Datos guardados en `localStorage` (por dispositivo)
- **Solucion**: Movido todo a `user_settings` en la DB

---

## Como agregar un bug

1. Copia el template `Bug Report` desde Templates
2. Pegalo en esta nota o crea una nota nueva
3. Llena los campos
4. Cuando se resuelva, movelo a "Resueltos"
