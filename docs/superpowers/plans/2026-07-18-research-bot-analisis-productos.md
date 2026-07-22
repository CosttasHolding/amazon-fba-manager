# Research Bot - Analisis Automatico de Productos Amazon

> **Para agentes de codigo:** Usar superpowers:subagent-driven-development o superpowers:executing-plans para implementar este plan tarea por tarea.

**Objetivo:** Un bot que al ingresar un ASIN de Amazon, automaticamente analice el producto y llene todos los campos del modulo de Research (categoria, ventas mensuales, reviews, ROI, competencia, keywords, etc).

**Arquitectura:** El usuario ingresa un ASIN -> SP-API trae datos reales del listing -> OpenAI GPT-4o analiza y estima campos faltantes -> Usuario revisa en modal preview -> Guarda con un click.

**Tech Stack:** OpenAI SDK, SP-API (ya conectado), Next.js API routes, Zod, React, shadcn/ui, SWR.

---

## Decisiones Tecnicas

| Decision | Eleccion | Razon |
|----------|----------|-------|
| AI Provider | OpenAI GPT-4o | Mas barato (~$0.01/producto), rapido, suficiente para analisis |
| Fuente de datos | SP-API (ya conectado) | Gratis, ya funciona en la app |
| UX | Barra de ASIN + "Analizar" en modal | Doble acceso, simple |
| Profundidad | Producto + competencia basica | Medio-term, expandible despues |
| Persistencia | Guardar en product_research existente | No crear tablas nuevas |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React)                   │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Barra ASIN   │  │ Modal Preview│  │ Kanban    │  │
│  │ (page.tsx)   │  │ (nuevo)      │  │ existente │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┘  │
│         │                  │                          │
│         ▼                  ▼                          │
│  ┌─────────────────────────────────┐                 │
│  │    POST /api/research/analyze   │                 │
│  └──────────────┬──────────────────┘                 │
└─────────────────┼────────────────────────────────────┘
                  │
┌─────────────────┼────────────────────────────────────┐
│                 BACKEND (Next.js API)                 │
│                  │                                    │
│  ┌───────────────▼──────────────┐                    │
│  │   1. SP-API: getListings()   │  ← Datos reales   │
│  │   (titulo, precio, cats,     │    de Amazon       │
│  │    imagenes, bullet points)  │                    │
│  └───────────────┬──────────────┘                    │
│                  │                                    │
│  ┌───────────────▼──────────────┐                    │
│  │   2. OpenAI GPT-4o           │  ← Analisis IA    │
│  │   Prompt estructurado con    │                    │
│  │   los datos del listing      │                    │
│  └───────────────┬──────────────┘                    │
│                  │                                    │
│  ┌───────────────▼──────────────┐                    │
│  │   3. Respuesta estructurada  │                    │
│  │   JSON con todos los campos  │                    │
│  └──────────────────────────────┘                    │
└──────────────────────────────────────────────────────┘
```

---

## Archivos a Crear/Modificar

### 2.1 Infraestructura IA (nuevos)

| Archivo | Que hace |
|---------|----------|
| `src/lib/ai/client.ts` | Cliente OpenAI reutilizable (1 sola instance) |
| `src/lib/ai/prompts.ts` | Templates de prompts para analisis de productos |
| `src/lib/ai/types.ts` | Tipos TS para las respuestas de AI |
| `src/app/api/research/analyze/route.ts` | API endpoint que orquesta SP-API + AI |

### 2.2 Frontend Research (modificar/crear)

| Archivo | Que cambia |
|---------|------------|
| `src/app/(dashboard)/research/page.tsx` | Agregar barra de ASIN + estado de analisis |
| `src/components/research/product-analyzer.tsx` | **Nuevo** - Modal de preview con campos pre-llenados |
| `src/components/research/analyze-button.tsx` | **Nuevo** - Boton reutilizable "Analizar con AI" |
| `src/hooks/use-research.ts` | **Nuevo** - SWR hooks para research (falta en la app) |

### 2.3 Configuracion

| Archivo | Que cambia |
|---------|------------|
| `.env.local` | Agregar `OPENAI_API_KEY` |
| `.env.example` | Documentar la variable |
| `package.json` | Instalar `openai` SDK |

---

## Detalle por Componente

### 3.1 `src/lib/ai/client.ts` - Cliente OpenAI

```typescript
import OpenAI from "openai";

// Singleton - una sola instancia
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { openai };
```

### 3.2 `src/lib/ai/prompts.ts` - Prompt de Analisis

El prompt es critico. Le dice al AI que hacer con los datos:

```typescript
export function buildAnalyzeProductPrompt(listing: ListingData) {
  return `
Eres un experto en vender productos en Amazon FBA. Analiza el siguiente
producto y proporciona un analisis completo en formato JSON.

DATOS DEL PRODUCTO (obtenidos de Amazon):
- Titulo: ${listing.title}
- Precio: ${listing.price} ${listing.currency}
- Categoria: ${listing.category}
- Bullet Points: ${listing.bulletPoints?.join(', ')}
- Marca: ${listing.brand}
- ASIN: ${listing.asin}

DEVUELVE UN JSON CON EXACTAMENTE ESTA ESTRUCTURA:
{
  "name": "nombre del producto (max 200 chars)",
  "niche": "nicho especifico al que pertenece",
  "amazon_category": "categoria principal de Amazon",
  "estimated_monthly_sales": numero estimado de ventas mensuales,
  "average_price": precio promedio del mercado,
  "review_count_competitor": estimacion de reviews del top competitor,
  "average_rating": rating promedio estimado (0.00-5.00),
  "bsr": best seller rank estimado,
  "competition_level": "low" | "medium" | "high",
  "estimated_cogs": costo estimado de bienes (40-60% del precio),
  "estimated_selling_price": precio sugerido de venta,
  "estimated_roi": ROI estimado como porcentaje,
  "differentiation_notes": "como diferenciarse de la competencia",
  "keywords": ["palabra", "clave", "1", "2", "3"],
  "notes": "analisis detallado del mercado y oportunidad"
}

REGLAS:
- Si no puedes estimar un campo, pon null
- Las ventas mensuales estimadas deben ser realistas (100-10000)
- El ROI debe ser realista para FBA (15-50% tipico)
- El COGS tipicamente es 30-60% del precio de venta
- Competition level basado en: reviews altos + muchas marcas = high
- Keywords deben ser relevantes para PPC
- Todas las respuestas en espanol

Responde SOLO con el JSON, sin texto adicional.
`;
}
```

### 3.3 `src/app/api/research/analyze/route.ts` - La API

Flujo del endpoint:
1. Recibe `{ asin: string }` o `{ url: string }` (extrae ASIN de URL)
2. Valida el ASIN con regex
3. Llama a SP-API `getListings(asin)` para obtener datos reales
4. Arma el prompt con los datos del listing
5. Llama a OpenAI GPT-4o
6. Parsea la respuesta JSON
7. Valida con Zod
8. Retorna los campos pre-llenados (NO guarda automaticamente)
   → El usuario revisa y decide si guardar

### 3.4 Frontend: Barra de ASIN en Research Page

Se agrega arriba del Kanban, al lado del search existente:

```
┌──────────────────────────────────────────────────────┐
│ [🔍 Buscar...]  [📋 Lista] [📊 Kanban]              │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │  🔎 Pegá un ASIN o URL de Amazon... [Analizar] │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│  Columnas del Kanban...                               │
└──────────────────────────────────────────────────────┘
```

### 3.5 `src/components/research/product-analyzer.tsx` - Modal Preview

```
┌─────────────────────────────────────────────────────┐
│  🔍 Analisis de Producto              [X] cerrar    │
│─────────────────────────────────────────────────────│
│                                                      │
│  📦 Smart Home Security Camera                       │
│  ASIN: B08XYZ123 | Categoria: Electronics            │
│                                                      │
│  ┌─────────────────┬─────────────────────────────┐  │
│  │ DATOS ESTIMADOS │  🤖 Generados por AI         │  │
│  ├─────────────────┼─────────────────────────────┤  │
│  │ Ventas/mes      │  1,200 unidades             │  │
│  │ Precio promedio │  $34.99                      │  │
│  │ Reviews top 1   │  15,000                      │  │
│  │ Rating promedio │  4.3/5                       │  │
│  │ BSR             │  #2,450                      │  │
│  │ Competencia     │  🔴 Alta                     │  │
│  │ COGS estimado   │  $12.00                      │  │
│  │ Precio venta    │  $29.99                      │  │
│  │ ROI estimado    │  22%                         │  │
│  │ Diferenciacion  │  LED night mode, app...      │  │
│  │ Keywords        │  security camera, wifi...    │  │
│  └─────────────────┴─────────────────────────────┘  │
│                                                      │
│  📝 Notas del analisis:                              │
│  "Mercado con alta demanda pero mucha competencia.   │
│   Oportunidad en nicho de camaras indoor con IA..."  │
│                                                      │
│  [✏️ Editar antes de guardar]  [✅ Guardar directo]  │
└─────────────────────────────────────────────────────┘
```

### 3.6 `src/hooks/use-research.ts` - SWR Hooks

La app actualmente NO tiene hooks SWR para research (usa fetch raw). Hay que crear:

```typescript
// useResearch() - lista paginada
// useResearchItem(id) - detalle individual
// useAnalyzeProduct() - mutacion para analisis AI
```

---

## Tipos Necesarios

```typescript
// src/lib/ai/types.ts
interface ListingData {
  asin: string;
  title: string;
  price: number;
  currency: string;
  category: string;
  brand: string;
  bulletPoints: string[];
  images: string[];
  description?: string;
}

interface AnalyzeProductResponse {
  name: string;
  niche: string | null;
  amazon_category: string | null;
  estimated_monthly_sales: number | null;
  average_price: number | null;
  review_count_competitor: number | null;
  average_rating: number | null;
  bsr: number | null;
  competition_level: 'low' | 'medium' | 'high';
  estimated_cogs: number | null;
  estimated_selling_price: number | null;
  estimated_roi: number | null;
  differentiation_notes: string | null;
  keywords: string[];
  notes: string | null;
}
```

---

## Manejo de Errores

| Escenario | UX |
|-----------|-----|
| SP-API no conectado | Toast error: "Conectá tu SP-API en Settings > SP-API" |
| ASIN no encontrado | Toast: "No se encontró producto con ese ASIN" |
| AI sin respuesta | Toast: "Error en el análisis. Intentá de nuevo." |
| AI respuesta invalida | Retry automatico 1 vez, si falla → error |
| Limite de rate | Toast: "Max 10 analisis por minuto" |
| Sin API key de OpenAI | Toast: "Configura OPENAI_API_KEY en tu .env" |

---

## Seguridad

- **NUNCA** exponer `OPENAI_API_KEY` al frontend (solo en server-side API routes)
- Rate limiting en el endpoint (ya existe en `api-handler.ts`)
- Validar ASIN con regex antes de llamar a SP-API
- Sanitizar la respuesta de AI antes de guardar (no HTML, no scripts)
- Limite de caracteres en el prompt para evitar tokens excesivos

---

## Costos Estimados

| Concepto | Costo |
|----------|-------|
| OpenAI GPT-4o por analisis | ~$0.01-0.03 USD |
| 10 analisis/dia | ~$0.10-0.30 USD/dia |
| 300 analisis/mes | ~$3-9 USD/mes |
| SP-API | Gratis (ya conectado) |

---

## Orden de Implementacion

### PASO 1: Infraestructura IA
- Instalar openai SDK (`npm install openai`)
- Crear `src/lib/ai/client.ts`
- Crear `src/lib/ai/types.ts`
- Crear `src/lib/ai/prompts.ts`
- Agregar env var `OPENAI_API_KEY` en `.env.local` y `.env.example`
- **Test:** Verificar conexion con OpenAI (llamada simple de prueba)

### PASO 2: API de Analisis
- Crear `src/app/api/research/analyze/route.ts`
- Conectar SP-API `getListings` + OpenAI
- Validar respuesta con Zod
- **Test:** Llamar con un ASIN real y ver respuesta

### PASO 3: Frontend - Componente de Analisis
- Crear `src/components/research/product-analyzer.tsx` (modal preview)
- Crear `src/components/research/analyze-button.tsx`
- **Test:** Modal se abre y muestra datos correctamente

### PASO 4: Integracion en Research Page
- Agregar barra de ASIN en `src/app/(dashboard)/research/page.tsx`
- Conectar con API de analisis
- Flujo completo: ASIN → analisis → preview → guardar
- **Test:** Flujo end-to-end funcionando

### PASO 5: Hooks SWR + Refactor
- Crear `src/hooks/use-research.ts` con SWR
- Refactorizar `page.tsx` para usar hooks
- **Test:** CRUD funciona igual pero con SWR

### PASO 6: Polish + Deploy
- Estados de carga (skeleton, spinner)
- Mensajes de error claros
- Responsive (mobile)
- Deploy a Vercel automatico

---

## Cosas a Tener en Cuenta

1. **SP-API getListings limitacion:** Solo funciona si tenes permisos de Seller. Si el usuario no tiene SP-API conectado, el bot no puede traer datos. Podriamos agregar un fallback manual (el usuario pega datos y el AI los analiza).

2. **Prompt engineering:** El prompt va a necesitar iteracion. La primera version no va a ser perfecta. Hay que probar con 10-15 ASINs reales y ajustar.

3. **Respuestas inconsistentes de AI:** A veces AI devuelve JSON malformado. Hay que tener un parser robusto con retry.

4. **Idioma:** Los listings de Amazon.com estan en ingles, pero el usuario quiere todo en espanol. El prompt debe traducir.

5. **Cache opcional:** Podriamos cachear analisis de ASINs ya analizados para no gastar tokens redundantes. Tabla nueva `research_cache` o simplemente buscar en `product_research` por ASIN.

---

## Roadmap Futuro (post-Research Bot)

Una vez que el Research Bot funcione perfecto, se puede expandir a:

1. **Re-analisis:** Boton "Re-analizar" en productos existentes
2. **Bulk analysis:** Analizar multiples ASINs de una vez
3. **Sugerencias de nicho:** AI sugiere nichos basados en tendencias
4. **Automatizacion de products:** Crear products directamente desde research con datos completos
5. **Automatizacion de suppliers:** Buscar proveedores automaticamente para un producto
6. **Automatizacion de orders:** Generar POs desde research aprobado
7. **Dashboard de oportunidades:** AI escanea mercados y sugiere productos
8. **Monitoreo continuo:** Alertas cuando cambian precios/rankings de productos investigados

---

## Requisitos Previos

- [ ] API key de OpenAI (agregar en `.env.local` como `OPENAI_API_KEY=sk-...`)
- [ ] SP-API conectado y funcionando para traer listings
- [ ] Node.js 18+ (ya instalado)
- [ ] Build pasando sin errores (ya esta asi)

---

## Referencias

- SP-API: `src/lib/sp-api/endpoints.ts` → `getListings()`
- API Handler: `src/lib/api-handler.ts` → `createApiHandler()`
- Research existente: `src/app/(dashboard)/research/page.tsx`
- Tipos: `src/types/index.ts` → `ProductResearch`
- Validaciones: `src/validations/research.ts` → `researchSchema`
