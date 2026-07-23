# Design: Auto-completado desde URLs de Amazon/Alibaba

## Resumen

Agregar funcionalidad para que al pegar un link de Amazon o Alibaba en los forms de producto/proveedor, se extraiga automáticamente la información relevante y se completen los campos del formulario.

## Decisiones Clave

| Decisión | Elección |
|----------|----------|
| Método de extracción | SP-API para Amazon (cuando disponible) + Puppeteer como fallback. Puppeteer directo para Alibaba |
| Dónde aparece | Campo URL en forms de producto Y proveedor + botón "Importar desde URL" en dashboard |
| UX | Auto-detect + auto-completar con spinner inline |
| Errores | Toast de error + campos vacíos para completar manualmente |

## Arquitectura

### Nuevo endpoint: `POST /api/scrape`

**Ubicación:** `src/app/api/scrape/route.ts`

**Request:**
```typescript
{ url: string }
```

**Response:**
```typescript
{
  platform: "amazon" | "alibaba",
  data: ProductData | SupplierData
}
```

**Flujo:**
1. Parsear URL → detectar plataforma (amazon.com / alibaba.com)
2. Si es Amazon:
   a. Extraer ASIN del URL (regex `B[A-Z0-9]{9}`)
   b. Si SP-API conectado → `getCatalogItem(asin)` + pricing
   c. Si falla/no hay conexión → Puppeteer scraping
3. Si es Alibaba → Puppeteer scraping directo
4. Si todo falla → retornar error con mensaje descriptivo

### Scraping Service

**Ubicación:** `src/lib/scraping/`

**Archivos:**
- `index.ts` — función principal `scrapeUrl(url: string)`
- `amazon.ts` — selectores y lógica para Amazon
- `alibaba.ts` — selectores y lógica para Alibaba
- `types.ts` — tipos para datos extraídos
- `selectors.ts` — selectores CSS centralizados (fáciles de actualizar)

### Selectores CSS

#### Amazon

| Campo | Selector | Transformación |
|-------|----------|----------------|
| Nombre | `#productTitle` | innerText, trim |
| Precio | `.a-price .a-offscreen` | parse float |
| Peso | `#productDetails_techSpec_section_1` → fila "Weight" | parse float, convertir a kg |
| Categoría | `#wayfinding-breadcrumbs_container a:last-child` | mapear al enum del schema |
| Imagen | `#landingImage` o `#imgBlkFront` | src attribute |
| Descripción | `#feature-bullets` | innerText de bullet points |
| Dimensiones | `#productDetails_techSpec_section_1` | tabla tech specs |

#### Alibaba

| Campo | Selector | Transformación |
|-------|----------|----------------|
| Nombre | `.title-text`, `.product-title` | innerText, trim |
| Precio | `.price-text`, `.m-gallery-offer-price` | parse float rango → primer valor |
| MOQ | `.quantity`, `.min-order` | parse int |
| Proveedor | `.company-name`, `.supplier-name` | innerText |
| País | `.supplier-country` | innerText |
| Imagen | `.main-image img` | src attribute |
| Descripción | `.product-desc`, `.detail-desc` | innerText |

### Mapeo de datos extraídos → campos del form

#### Amazon → Producto

| Dato extraído | Campo del form | Notas |
|---------------|----------------|-------|
| `name` | `name` | Reemplaza si vacío |
| `asin` | `asin` | Auto-completa |
| `price` | `salePrice` | Solo si > 0 |
| `weight_kg` | `weightKg` | Solo si > 0 |
| `category` | `category` | Mapear a enum (Electronics → "electronics") |

#### Alibaba → Proveedor

| Dato extraído | Campo del form | Notas |
|---------------|----------------|-------|
| `supplier_name` | `name` | Reemplaza si vacío |
| `country` | `country` | Default "China" |
| `moq` | `min_order_qty` | Solo si > 0 |
| `unit_price` | — | Se usa en `product_suppliers.unit_cost` al vincular |

## UI

### Campo URL en Form de Producto

**Archivos a modificar:**
- `src/app/(dashboard)/products/new/page.tsx` — agregar campo URL al inicio del form
- `src/components/product-form-modal.tsx` — agregar campo URL

**Comportamiento:**
1. Campo `url` al inicio del form, con icono de búsqueda
2. Auto-detect: al pegar/typing, detectar si es link de Amazon o Alibaba
3. Debounce: 500ms después de dejar de escribir
4. Loading: spinner inline "Extrayendo datos..."
5. Auto-complete: rellenar campos coincidentes
6. Todos los campos auto-completados siguen siendo editables
7. Error: toast "No se pudieron extraer los datos. Completá manualmente."

### Campo URL en Form de Proveedor

**Archivos a modificar:**
- `src/app/(dashboard)/suppliers/new/page.tsx` — el campo `alibaba_url` ya existe, agregar lógica de scraping
- `src/components/supplier-form-modal.tsx` — agregar lógica de scraping

### Botón "Importar desde URL" en Dashboard

**Archivos a crear/modificar:**
- Componente: `src/components/url-import-dialog.tsx` — modal con campo URL + radio buttons (Producto/Proveedor)
- Integrar en dashboard: `src/app/(dashboard)/page.tsx` o componente del sidebar

**Flujo:**
1. Click en "Importar desde URL"
2. Modal: pegar link + seleccionar tipo (Producto/Proveedor)
3. Click "Importar" → llama a `/api/scrape`
4. Extrae datos → redirige al form correspondiente con query params o estado
5. Form se carga con campos pre-llenados

## Dependencias nuevas

```bash
npm install puppeteer
```

**Nota:** Puppeteer descarga Chromium (~170MB). En produción, considerar usar `puppeteer-core` + Chrome ya instalado en el servidor.

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `src/lib/scraping/index.ts` | Función principal `scrapeUrl()` |
| `src/lib/scraping/amazon.ts` | Scraping de Amazon |
| `src/lib/scraping/alibaba.ts` | Scraping de Alibaba |
| `src/lib/scraping/types.ts` | Tipos de datos extraídos |
| `src/lib/scraping/selectors.ts` | Selectores CSS centralizados |
| `src/app/api/scrape/route.ts` | API endpoint POST |
| `src/components/url-import-dialog.tsx` | Modal de importación |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/(dashboard)/products/new/page.tsx` | Agregar campo URL + lógica de auto-completado |
| `src/components/product-form-modal.tsx` | Agregar campo URL + lógica de auto-completado |
| `src/app/(dashboard)/suppliers/new/page.tsx` | Agregar lógica de scraping al campo `alibaba_url` existente |
| `src/components/supplier-form-modal.tsx` | Agregar lógica de scraping |
| `src/app/(dashboard)/page.tsx` | Agregar botón "Importar desde URL" |
| `package.json` | Agregar `puppeteer` como dependencia |

## Manejo de Errores

| Escenario | Comportamiento |
|-----------|----------------|
| URL no válida | Toast error + no hacer nada |
| Plataforma no reconocida | Toast "Solo se admiten links de Amazon y Alibaba" |
| Scraping falla | Toast "No se pudieron extraer los datos. Completá manualmente." |
| Timeout (30s) | Toast error + campos vacíos |
| SP-API no conectado | Fallback a Puppeteer silencioso |

## Testing

- **Unit tests:** Para parsing de URLs (regex ASIN), mapeo de datos, selectores
- **Integration tests:** Para el endpoint `/api/scrape` con URLs mockeadas
- **E2E tests:** Para el flow completo de auto-completado en el form

## Limitaciones conocidas

1. **Selectores CSS pueden cambiar:** Amazon y Alibaba actualizan sus layouts frecuentemente. Los selectores están centralizados en `selectors.ts` para facilitar actualizaciones.
2. **Anti-bot:** Ambos sitios tienen protección contra scraping. Puppeteer con `headless: true` puede ser bloqueado. Solución: usar `puppeteer-extra` con plugin stealth en el futuro.
3. **Peso/dimensiones:** No siempre están disponibles en la página. Para Amazon, SP-API es más confiable.
4. **Precios de Alibaba:** Son rangos (MOQ-based), no un precio fijo.
