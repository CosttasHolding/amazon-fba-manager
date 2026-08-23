---
name: database-change
description: Procedimiento para cambios de esquema en Supabase del proyecto Amazon FBA Manager (migraciones nuevas, convenciones, aplicación en prod).
---

# Cambios de base de datos

## Convenciones de migración

1. Archivo nuevo en `supabase/migrations/NNN_nombre_snake_case.sql` — siguiente número libre (verificar con glob; existe deuda conocida de números duplicados 014/015).
2. NUNCA modificar una migración ya aplicada en prod: siempre crear una nueva que corrija hacia adelante.
3. Toda tabla nueva: `org_id UUID REFERENCES organizations(id)` + `ENABLE ROW LEVEL SECURITY` + policy base `is_org_member(org_id)` + índices `(org_id, ...)` según acceso.
4. `updated_at TIMESTAMPTZ DEFAULT now()` + trigger `trg_*_updated` si la tabla se edita desde UI.

## Antes de implementar

- Leer `DATABASE.md` (índice de tablas) + migraciones vecinas para el patrón real.
- Clasificar la tarea: migración destructiva, cambio de RLS o constraint de tenant = CRITICAL → plan explícito + aprobación del usuario.

## Aplicar en prod

- Las migraciones NO se auto-aplican: se ejecutan manualmente (Supabase SQL Editor o Management API) — pedir al usuario o solicitar aprobación explícita.
- Después de aplicar: verificar contra prod con lectura PostgREST read-only (patrón usado históricamente), registrar evidencia.

## Después

- Actualizar el índice de tablas de `DATABASE.md` si se creó/modificó tabla o vista.
- Tests: los mocks de Supabase son query builders encadenables (`vi.mock("@/lib/supabase/server")`) — agregar casos para columnas/constraints nuevos cuando aplique.
