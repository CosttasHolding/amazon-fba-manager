---
name: tenant-security
description: Checklist obligatoria antes de tocar DB, API routes, código server-side, service role, cron o MCP en el SaaS multi-tenant.
---

# Seguridad multi-tenant

## Checklist (todas ✓ antes de implementar)

1. **Autenticación**: ¿la ruta/operación exige sesión válida? (`createApiHandler` la resuelve; endpoints públicos como `/api/share/[token]`, `/api/mcp`, webhooks y cron son excepciones que requieren su propio mecanismo).
2. **Organización**: ¿el `org_id` sale del membership del usuario autenticado y NO del input del cliente?
3. **Membership/rol**: ¿se verifica que el usuario pertenece a esa org (y rol suficiente para la operación)?
4. **RLS**: ¿tabla con RLS habilitada y policy `is_org_member(org_id)`?
5. **Service role**: si el código usa `SUPABASE_SERVICE_ROLE_KEY`, RLS NO aplica — la autorización completa es responsabilidad del código. Tratar como CRITICAL.
6. **Fuga cross-tenant**: IDs manipulables en params/body, joins sin filtro org, respuestas que exponen filas de otras orgs, shares más permisivos que el diseño.
7. **Tests**: ¿existe test de tenant isolation para la ruta nueva/modificada?

## Reglas de escalado

- Cualquier cambio de RLS, constraint tenant o identidad org = CRITICAL: análisis de impacto → plan explícito → aprobación del usuario → security review independiente (agente `security-reviewer`).
- El MCP local (`opencode.json`) apunta a PRODUCCIÓN: toda mutación vía herramientas MCP es una operación sobre prod.

## Referencias

- Invariantes: `AGENTS.md` · Arquitectura RLS: `ARCHITECTURE.md` · Esquema: `DATABASE.md`
