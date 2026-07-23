---
tipo: referencia
tags: [decisiones, arquitectura, stack]
ultima_actualizacion: 2026-07-22
---

# Decisiones Tecnicas

> Por que elegimos cada tecnologia y patron en el proyecto.

---

## Base de datos: Supabase

**Decision**: Supabase como backend completo.

**Por que**:
- PostgreSQL + Auth + RLS + Storage + Realtime en uno solo
- No necesitamos configurar backend separado
- RLs (Row Level Security) para multi-tenant nativo
- SDK oficial para Next.js con SSR support

**Alternativa descartada**: Firebase (vendor lock-in mayor, menos flexible con SQL)

Ver: [[ARCHITECTURE]], [[DATABASE]]

---

## Framework: Next.js 14 App Router

**Decision**: Next.js con App Router (no Pages Router).

**Por que**:
- Server Components para reducir bundle
- Server Actions para mutations sin API routes manuales
- Streaming y Suspense para UX mejorada
- Deploy automatico en Vercel

**Alternativa descartada**: Remix (menos ecosistema), Vite+React (no tiene SSR nativo)

Ver: [[ARCHITECTURE]]

---

## UI: Tailwind + shadcn/ui

**Decision**: Tailwind CSS con componentes shadcn/ui.

**Por que**:
- CSS variable-based theming (dark/light automatico)
- shadcn/ui: componentes copiados, no dependencia npm
- Radix primitives para accesibilidad
- Facil de personalizar

**Alternativa descartada**: Material UI (mucho overhead), Chakra UI (menos flexible)

Ver: [[DESIGN_SYSTEM]], [[UI-PATTERNS]]

---

## State: SWR

**Decision**: SWR para fetching y caching de datos.

**Por que**:
- Cache automatico con revalidation
- Deduplication de requests
- Mutations optimistas
- Mas liviano que React Query

Ver: [[ARCHITECTURE]]

---

## Validacion: Zod

**Decision**: Zod para validacion de forms y API.

**Por que**:
- Type inference automatico (schema = tipo)
- Validacion en frontend y backend con el mismo schema
- Integracion con react-hook-form

Ver: [[CONVENTIONS]]

---

## Multi-tenant: org_id + RLS

**Decision**: Multi-tenant con columna `org_id` en todas las tablas + RLS de Supabase.

**Por que**:
- Aislamiento de datos por organizacion
- RLS previene acceso cruzado
- Un usuario puede pertenecer a multiples orgs

**Implementacion**: Ver migration `024_multi_tenant.sql`

Ver: [[DATABASE]]
