---
tipo: moc
tags: [index, app, arquitectura]
ultima_actualizacion: 2026-07-22
---

# App Index - Documentacion de la App

> Toda la documentacion tecnica de Amazon FBA Manager.

---

## Arquitectura General

- [[ARCHITECTURE]] - Stack tecnico, estructura de directorios, patrones de diseño
- [[DATABASE]] - Esquema de tablas, relaciones, migraciones
- [[API]] - Endpoints REST, autenticacion, patrones de error
- [[MODULES]] - Modulos de negocio, logica, relaciones

## Stack Tecnologico

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **State**: SWR para caching, react-hook-form + Zod para forms
- **Deploy**: Vercel con auto-deploy

## Modulos Principales

| Modulo | Ruta | Funcion |
|--------|------|---------|
| Dashboard | `/dashboard` | KPIs, graficos, alertas |
| Productos | `/products` | Catalogo FBA |
| Inventario | `/inventory` | Stock y movimientos |
| Ordenes | `/orders` | Compras y supply chain |
| Ventas | `/sales` | Tracking de ventas |
| Proveedores | `/suppliers` | Directorio de proveedores |
| Reportes | `/reports` | Analytics y reportes |
| Configuracion | `/settings` | Preferencias del usuario |

## Archivos Clave del Proyecto

```
src/
  app/(dashboard)/    # Paginas (Server Components)
  app/api/            # API routes
  components/         # Componentes React
  hooks/              # Custom hooks (useSWR)
  lib/                # Utilidades, validaciones, acciones server
  types/              # Tipos TypeScript
  validations/        # Schemas Zod
```
