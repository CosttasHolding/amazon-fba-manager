---
tipo: tracking
tags: [bug, problemas]
ultima_actualizacion: 2026-08-03
---

# Bugs Conocidos

> Lista de bugs pendientes o resueltos.

---

## Activos

### Deep dive falla por falta de creditos/licencias en xAI (BLOQUEADO)
- **Fecha**: 2026-08-01
- **Sintoma**: `/api/research/analyze-deep` y `/api/research/analyze` devuelven `403 Your newly created team doesn't have any credits or licenses yet`
- **Causa**: la key `XAI_API_KEY` es VALIDA (autenticacion OK, llega a api.x.ai) pero el team no tiene creditos/licencias cargadas
- **Solucion**: comprar creditos en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **Adicional**: XAI_API_KEY solo esta en `.env.local` — falta agregarla en Vercel (prod) o el deep dive fallara en produccion
- **Seguridad**: las keys de OpenAI y xAI quedaron expuestas en el chat del 2026-08-01. **DECISION**: riesgo bajo (sin creditos hoy), rotar cuando el usuario cargue creditos — ahi generar key nueva en vez de usar la expuesta

### Score no se recalcula al editar el producto manualmente
- **Fecha**: 2026-08-03
- **Sintoma**: el score de captura queda "stale" — si se editan ventas/precio/BSR desde el modal de edicion (o via `POST /api/research` del analyzer/deep dive), la columna `score` y `score_details` no se recalculan y la card muestra un score que ya no refleja los datos editados
- **Causa**: `calculateScore()` solo se invoca en `POST /api/research/capture`. `PUT /api/research` y `POST /api/research` (rutas de edicion) no lo tocan
- **Estado**: follow-up MEDIUM registrado (fuera de scope del spec original, que solo cubria el capture). Fix propuesto: recalcular en PUT (mergear row existente + payload a traves de `toScoringInput`) o documentar `score` como snapshot de captura. **APLICA TAMBIEN a `competition_level`** (no se recalcula al editar)
- **Referencia**: final review del 2026-08-03, finding Important #1

### Verificacion E2E pendiente: competencia 5 niveles + Niche Score (2026-08-03)
- **Estado**: la feature esta completa y verificada con tests (268/268), pero falta E2E real con AMZScout logueado
- **Pendiente**: (1) aplicar migracion `031_competition_5_levels.sql` en Supabase prod; (2) verificar que el Niche Score de los totals de AMZScout se captura y deriva el badge de competencia (very_low..very_high) en el popup y en la card kanban

---

## Resueltos

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
