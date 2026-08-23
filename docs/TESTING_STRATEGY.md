# Testing Strategy — Verificación proporcional al riesgo

Fuente: auditoría 2026-08-22. Principio: **el check más barato que prueba el cambio correctamente**; escalar proceso con riesgo, no con tamaño.

## Mapa cambio → verificación

| Tipo de cambio | Verificación mínima |
|---|---|
| UI simple (copy, estilos, iconos) | `npm run typecheck` + lint targeted del archivo |
| Hook / lógica de negocio | typecheck + unit tests relacionados (`vitest run <ruta>`) |
| API route | typecheck + tests de la route + test tenant isolation si toca queries |
| Bug fix | regression test que reproduce el bug (RED→GREEN) |
| Código financiero (`calculations.ts`, `dashboard/metrics.ts`, `research/scoring.ts`, `recompute.ts`) | unit tests con valores esperados exactos + review independiente |
| DB / RLS | migración verificada contra prod read-only + tests tenant security |
| Auth / seguridad | tests auth/RLS + E2E de los flujos afectados |
| Feature grande | suite completa + review |
| Pre-commit / pre-merge | `typecheck` + `lint` + `test:run` + `build` |

## Estado actual (baseline)

- Unit: Vitest — 47 archivos / 391 tests, todos verdes (~6s).
- E2E: Playwright — solo smoke (auth render, navegación, 404). **No cubre contenido ni CRUD.**
- Tenant isolation: **sin tests dedicados** (gap crítico, ver SECURITY_AUDIT).
- CI: inexistente.

## Prioridades de automatización (mayor valor de regresión primero)

1. **Tenant isolation**: plantilla de test por patrón de route (org_id filtrado, membership, service-role paths).
2. **Cálculos financieros**: valores esperados exactos ya cubiertos parcialmente; mantener al tocar scoring/metrics.
3. **Research capture**: capture → score persistido → UI muestra (mock e2e o integración).
4. **Inventory consistency**: movimientos ↔ stock.
5. **Flujos críticos E2E** cuando exista ambiente de staging con datos controlados.

## Reglas

- Un HTTP 200 NO es evidencia: verificar efecto observable (fila creada, campo actualizado).
- Todo FAIL de QA genera candidato a regression test antes de cerrar.
- No ejecutar suite completa por microcambios; sí pre-commit y tras COMPLEX/CRITICAL.
