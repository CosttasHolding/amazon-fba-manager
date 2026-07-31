# Diseño: Motor de Investigación de Productos (Product Research Engine)

**Fecha:** 2026-07-30
**Objetivo:** Encontrar productos ganadores en Amazon usando datos de H10 Xray + scraper propio + análisis IA
**Enfoque:** Chrome Extension descargable desde la web + web app en Vercel para scoring/análisis
**Estado:** Aprobado por el usuario

---

## Resumen

El Motor de Investigación permite al usuario encontrar productos ganadores en Amazon mediante una Chrome Extension que captura datos de la página de Amazon (precio, BSR, reviews, ventas estimadas) usando dos fuentes: H10 Xray (si está activo) o scraper directo (siempre disponible). Los datos se muestran en un popup para revisión/edición antes de enviarlos a la web, donde un scoring engine y GPT-4o analizan cada producto para determinar su potencial.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      CHROME EXTENSION                       │
│                                                             │
│  Amazon.com → content script detecta datos                  │
│    ├─ Modo H10:  lee overlay de Xray en el DOM             │
│    └─ Modo Scraper: extrae datos públicos de la página      │
│         ↓                                                   │
│    Popup muestra datos editables                            │
│         ↓ [Enviar]                                          │
│    POST /api/research/capture                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      WEB APP (Vercel)                       │
│                                                             │
│  /research → tabla de resultados                            │
│              scoring engine (demanda, competencia, margen)  │
│              deep dive con GPT-4o (reviews, diferenciación) │
│              guardar a product_research                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Sección 1: Chrome Extension "FBA Research Agent"

### 1.1 Estructura del proyecto

La extensión vive en `src/chrome-extension/` y se compila/build independientemente.

```
src/chrome-extension/
  manifest.json
  popup/
    popup.html       ← Interfaz con datos editables + botón enviar
    popup.css
    popup.ts
  content/
    content.ts       ← Content script que inyecta en Amazon
    scraper.ts       ← Modo scraper directo (BSR, precio, reviews)
    h10-reader.ts    ← Modo H10 (lee overlay de Xray del DOM)
  icons/
    icon-16.png
    icon-48.png
    icon-128.png
  utils/
    api.ts           ← Enviar datos a /api/research/capture
    detect-h10.ts    ← Detecta si H10 Xray está visible en DOM
```

### 1.2 Detección de H10 Xray

`content.ts` se activa en `*://www.amazon.com/*` y `*://www.amazon.es/*` (marketplaces a configurar).

Usa `MutationObserver` para detectar cuándo H10 inyecta su overlay:

```ts
// detect-h10.ts — simplificado
const observer = new MutationObserver(() => {
  const xrayContainer = document.querySelector('[class*="xray"], [id*="h10"], .helium-xray-overlay');
  if (xrayContainer) {
    // H10 está activo en esta página
    extractH10Data(xrayContainer);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

Si `detect-h10.ts` encuentra el overlay de Xray, extrae los datos. Si no, activa `scraper.ts` como fallback.

### 1.3 Captura de datos

**Modo H10:** Lee del DOM los elementos que H10 inyecta (selectores CSS basados en la estructura de Xray). Extrae por cada producto visible en search results:

| Dato | Fuente |
|------|--------|
| ASIN | DOM de H10 o Amazon |
| Nombre | Amazon page |
| Precio | Amazon page |
| BSR | H10 overlay o Amazon |
| Reviews count | H10 overlay o Amazon |
| Rating | H10 overlay o Amazon |
| Ventas estimadas/mes | H10 overlay (Xray) |
| Revenue estimado/mes | H10 overlay (Xray) |
| Fees FBA estimados | H10 overlay (Xray) |
| # sellers FBA/FBM | H10 overlay o Amazon |

**Modo Scraper:** Extrae datos públicos directamente del DOM de Amazon sin H10. Las ventas se estiman vía GPT-4o usando BSR + categoría (posteriormente en la web).

### 1.4 Popup de revisión

Cuando el usuario hace clic en el icono de la extensión, se abre:

```
┌─────────────────────────────────────┐
│  🔬 FBA Research Agent             │
│                                     │
│  📄 amazon.com/dp/B0XXXXX          │
│                                     │
│  Datos capturados:                  │
│  ┌─────────────────────────────┐   │
│  │ Producto: Yoga Mat Premium  │   │
│  │ ASIN:     B0XXXXXXXXX       │   │
│  │ Precio:   $29.99            │   │
│  │ BSR:      #1,234            │   │
│  │ Reviews:  567  ★ 4.2        │   │
│  │ Ventas/m: 1,200 uds         │   │
│  │ Revenue:  $35,988           │   │
│  │ Fees:     $8.50             │   │
│  │ Sellers:  3 FBA / 2 FBM    │   │
│  │ Categoría: Sports & Fitness │   │
│  └─────────────────────────────┘   │
│                                     │
│  [✏️ Editar] [📤 Enviar a la web]  │
│                                     │
│  📡 Fuente: H10 Xray                │
│  Modo:    Search Results (5 prods)  │
└─────────────────────────────────────┘
```

- **Editar:** el usuario puede modificar cualquier campo antes de enviar
- **Enviar a la web:** envía POST a `/api/research/capture` con auth token
- Si hay múltiples productos en search results, se envían todos juntos

---

## Sección 2: Web App - Página `/research`

### 2.1 Layout de la página

```
┌────────────────────────────────────────────────────────┐
│  🔬 Motor de Investigación                              │
│                                                         │
│  ┌─── ⚡ Research Agent ─────────────────────────────┐ │
│  │                                                    │ │
│  │  Descargá la Chrome Extension para capturar datos  │ │
│  │  desde Amazon + H10 Xray                           │ │
│  │                                                    │ │
│  │  [📥 Descargar Chrome Extension (.zip)]            │ │
│  │  [📖 Guía de instalación]                          │ │
│  │                                                    │ │
│  │  También podés analizar cualquier ASIN directo:    │ │
│  │  ┌────────────────────────────┐  [🔍 Analizar]    │ │
│  │  │ Pegá un ASIN o URL...      │                    │ │
│  │  └────────────────────────────┘                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─── Resultados recientes ─────────────────────────┐ │
│  │                                                    │ │
│  │  ┌────┬──────────┬───────┬──────┬────┬────┬────┐ │ │
│  │  │ASIN│Producto  │Ventas │Rev   │BSR │Score│Act │ │ │
│  │  ├────┼──────────┼───────┼──────┼────┼────┼────┤ │ │
│  │  │B0..│Yoga Mat  │1,200/m│$35.9K│#1.2│92  │[▶]│ │ │
│  │  │B0..│Foam Roll │800/m  │$15.9K│#3.4│78  │[▶]│ │ │
│  │  │B0..│Res bands │500/m  │$8.9K │#5.6│65  │[▶]│ │ │
│  │  └────┴──────────┴───────┴──────┴────┴────┴────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 2.2 Scoring Engine

Cada producto recibe un score de 0-100 basado en 4 dimensiones:

| Dimensión | Peso | Inputs |
|-----------|------|--------|
| Demanda | 35% | Ventas estimadas/mes, Revenue, Tendencia BSR |
| Competencia | 30% | # sellers, Review count del top 3, Rating promedio |
| Rentabilidad | 25% | Precio venta - Fees FBA - COGS estimado |
| Oportunidad | 10% | BSR bajo + pocos reviews = oportunidad de entrada |

**Fórmula simplificada:**
```
score = demanda * 0.35 + (100 - competencia_normalizada) * 0.30 + rentabilidad * 0.25 + oportunidad * 0.10
```

### 2.3 Deep Dive con GPT-4o

Al hacer clic en un producto, se abre un panel con análisis IA:

```
┌─── Deep Dive ──────────────────────────────────────┐
│                                                     │
│  Yoga Mat Premium - B0XXXXXXXX                      │
│                                                     │
│  📊 Scoring                                          │
│  Demanda:       ██████████ 95/100                    │
│  Competencia:   ███████    70/100                    │
│  Rentabilidad:  ████████   85/100                    │
│  Oportunidad:   █████      50/100                    │
│  Total:         █████████  92/100                    │
│                                                     │
│  🤖 Análisis IA                                     │
│  Reviews analizadas: 567                             │
│  Dolor común: "se rompe fácil después de 3 meses"   │
│  "el grosor no es suficiente para yoga avanzado"     │
│                                                     │
│  Diferenciación:                                     │
│  - Material antideslizante reforzado                 │
│  - Grosor 8mm (vs 5mm promedio)                     │
│  - Garantía 2 años                                   │
│                                                     │
│  Oportunidad: ALTA                                   │
│  Nicho con demanda sólida y competidores débiles     │
│  en calidad del producto.                            │
│                                                     │
│  [📝 Editar] [💾 Guardar a Product Research]         │
└─────────────────────────────────────────────────────┘
```

### 2.4 Guardado a Product Research

El deep dive se puede guardar en la tabla `product_research` existente, heredando los campos:

- `name`, `asin_reference`, `amazon_category`, `estimated_monthly_sales`, `average_price`
- `review_count_competitor`, `average_rating`, `bsr`, `competition_level`
- `estimated_cogs`, `estimated_selling_price`, `estimated_roi`
- `differentiation_notes`, `keywords[]`, `status: "idea"`

---

## Sección 3: API y Almacenamiento

### 3.1 Endpoints

| Endpoint | Método | Auth | Propósito |
|----------|--------|------|-----------|
| `/api/research/capture` | POST | createApiHandler | Recibe datos desde la extension |
| `/api/research/scoring` | POST | createApiHandler | Calcula scores para productos |
| `/api/research/analyze-deep` | POST | createApiHandler | Deep dive con GPT-4o para un ASIN |

### 3.2 Tablas Supabase

Se reusa la tabla existente `product_research`. No se necesitan tablas nuevas.

Se agrega una columna opcional `source_data` (JSONB) para guardar los datos crudos de la extensión (ventas, revenue, fees, etc.) para referencia.

---

## Sección 4: Instalación y Uso

### 4.1 Cómo instalar la extensión

Desde la página `/research`:

1. Click en **"Descargar Chrome Extension (.zip)"**
2. Descomprimís el archivo
3. En Chrome/Edge: vas a `chrome://extensions`
4. Activás **"Modo desarrollador"** (esquina superior derecha)
5. Click en **"Cargar extensión sin empaquetar"**
6. Seleccionás la carpeta descomprimida
7. ✅ Extensión instalada. Aparece el icono 🔬 en la barra

### 4.2 Cómo usar

**Opción A: Xray (datos completos)**
1. Vas a Amazon.com → buscás una keyword
2. Abrís H10 → clickeás **Xray** → se muestran los datos
3. Hacés click en el icono 🔬 de nuestra extensión
4. Revisás los datos en el popup
5. Click **"Enviar a la web"**

**Opción B: Scraper directo (sin H10)**
1. Vas a Amazon.com → buscás una keyword
2. Hacés click en el icono 🔬 de nuestra extensión
3. La extensión scrapea los datos públicos disponibles
4. Revisás y enviás. Las ventas se estiman con GPT después.

---

## Sección 5: Testing

- Content script injection test: verificar que detecta H10 overlay correctamente
- Scraper test: extracción de datos desde páginas reales de Amazon
- Popup test: renderizado, edición, envío
- API test: `/api/research/capture` con autenticación
- Scoring test: verificar fórmula con casos borde
- Deep dive test: mock GPT-4o, verificar output

---

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/chrome-extension/manifest.json` | Crear |
| `src/chrome-extension/popup/popup.html` | Crear |
| `src/chrome-extension/popup/popup.css` | Crear |
| `src/chrome-extension/popup/popup.ts` | Crear |
| `src/chrome-extension/content/content.ts` | Crear |
| `src/chrome-extension/content/scraper.ts` | Crear |
| `src/chrome-extension/content/h10-reader.ts` | Crear |
| `src/chrome-extension/utils/api.ts` | Crear |
| `src/chrome-extension/utils/detect-h10.ts` | Crear |
| `src/app/research/page.tsx` | Crear |
| `src/app/api/research/capture/route.ts` | Crear |
| `src/app/api/research/scoring/route.ts` | Crear |
| `src/app/api/research/analyze-deep/route.ts` | Crear |
| `src/lib/research/scoring.ts` | Crear |
| `src/lib/research/types.ts` | Crear |
| `src/lib/research/analyzer.ts` | Crear (GPT analysis) |
