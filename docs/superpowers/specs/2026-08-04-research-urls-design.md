---
fecha: 2026-08-04
tipo: design-spec
tags: [spec, research, urls]
---

# Diseño: URL de Amazon (auto) + URL de Alibaba (manual) en Research

## Contexto

La vista Research (kanban) muestra productos de `product_research`. Hoy no hay forma de
abrir el producto en Amazon ni guardar un link de proveedor (Alibaba). La extensión
guarda `capture_url` (la URL de Amazon de la página capturada) dentro de `source_data`
(JSONB), pero puede ser una URL de búsqueda y no es editable ni queryable.

Los proveedores (`suppliers`) ya usan `alibaba_url` con validación
`z.union([z.string().url("URL inválida"), z.literal("")]).optional()`.

## Objetivos

1. Que cada producto de research tenga un link clicable a Amazon.
2. Que se pueda cargar manualmente el link de Alibaba del producto.
3. Que los productos capturados hereden automáticamente la URL de Amazon.

## Decisiones

- **`amazon_url`**: columna dedicada. Al capturar se autocompleta con
  `https://www.amazon.com/dp/${asin}` (URL limpia de página de producto, mejor que
  `capture_url` que puede ser de búsqueda). Editable en el modal.
- **`alibaba_url`**: columna dedicada, solo editable manual (no la llena la extensión).
- Sin backfill masivo de productos existentes: solo heredan la URL los que se
  re-capturen o se editen a mano.
- Ambos campos NO son de scoring: el recompute (`PUT/POST /api/research`) queda intacto.
- Validación: `z.union([z.string().url("URL inválida").max(2000), z.literal("")]).nullable().optional()`
  (mismo patrón que `supplier.alibaba_url`).

## Cambios

1. **Migración `033_research_urls.sql`**: `ALTER TABLE product_research ADD COLUMN IF NOT EXISTS amazon_url TEXT;` y `alibaba_url TEXT`.
2. **Tipo**: `ProductResearch` + `amazon_url: string | null` + `alibaba_url: string | null`.
3. **Schema**: `researchSchema` + 2 campos URL (validación de arriba).
4. **Capture route**: al construir el record, `amazon_url: asin ? \`https://www.amazon.com/dp/${asin}\` : null`.
5. **Modal** (`research/page.tsx`): 2 inputs (Amazon URL / Alibaba URL) en defaultValues,
   reset, resetForm, body de onSubmit y openEdit.
6. **Card kanban** (`research-card.tsx`): iconos `ExternalLink` para Amazon y Alibaba que
   abren en pestaña nueva (`target="_blank" rel="noopener noreferrer"`), con
   `e.stopPropagation()` para no disparar la edición. Solo si la URL existe.
7. **i18n**: keys `research.form.amazon_url` / `research.form.alibaba_url` y
   `research.card.amazon` / `research.card.alibaba` en es/en/ar.

## Tests

- Schema: URL válida aceptada, "" aceptada, URL inválida rechazada, null aceptado.
- Capture: `amazon_url` se construye desde el ASIN; si no hay ASIN, null.
- Suite completa: tsc 0 | lint solo warnings pre-existentes | test:run | build.

## Verificación manual

- Capturar un producto con la extensión → la card muestra icono de Amazon que abre el producto.
- Editar → se puede completar/modificar amazon_url y cargar alibaba_url.
