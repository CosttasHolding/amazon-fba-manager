# Roadmap de QA y deuda técnica con agentes

**Fecha:** 2026-08-25
**Estado:** diseño aprobado en chat; ejecución iniciada en la Fase 0 de Drive

## Objetivo

Cerrar los pendientes de mayor riesgo y valor de Amazon FBA Manager en un orden que reduzca incertidumbre de producción antes de invertir en deuda técnica. El trabajo se divide entre agentes locales especializados y acciones manuales del owner que requieren sesión, credenciales o aprobación explícita.

## Límites operativos

- Los agentes pueden inspeccionar, editar código/documentación local y ejecutar verificaciones locales.
- Los agentes no hacen push, deploy, cambios en Supabase/Vercel/Google Cloud ni mutaciones de datos productivos.
- Toda operación productiva queda como checkpoint explícito del owner.
- Un solo agente edita un conjunto de archivos compartido a la vez.
- Todo cambio API, server-side, auth, OAuth o tenant-scoped requiere revisión de `security-reviewer`.
- Todo cambio importante requiere revisión independiente de `reviewer`.
- No se reactivan features deshabilitadas por hallazgos de seguridad como parte de este roadmap.

## Roles de agentes

### Lead de implementación

Tipo: `general`.

Responsabilidades: implementar cambios locales, mantener el alcance, ejecutar tests relacionados y entregar evidencia reproducible. No modifica producción.

### Explorador/QA

Tipo: `explore` o `general` read-only.

Responsabilidades: localizar flujos, preparar matrices de casos, identificar fixtures, revisar documentación y convertir verificaciones manuales en pasos reproducibles.

### Revisor de código

Tipo: `reviewer`.

Responsabilidades: revisión independiente de bugs, regresiones, cobertura y consistencia con convenciones. No edita salvo que se le asigne explícitamente una ronda de fix posterior.

### Revisor de seguridad tenant

Tipo: `security-reviewer`.

Responsabilidades: auth, membership, roles, `org_id`, RLS, service role, OAuth, webhooks y riesgo cross-tenant. Debe emitir una conclusión explícita antes de cerrar fases críticas.

### Owner

Persona usuaria.

Responsabilidades: navegador autenticado, cuentas externas, OAuth, Google Cloud, Vercel, Supabase productivo y decisiones de push/deploy. El owner aporta evidencia de los pasos manuales.

## Orden de fases

### Fase 0: consolidar Drive local

**Motivo:** el worktree ya contiene cambios no commiteados en Drive y tests nuevos. Es el frente activo y toca API server-side/OAuth.

**Agentes:**

- `general`: entender y completar el diff actual sin revertir cambios existentes; cubrir upload, list, metadata, rename, download y delete.
- `security-reviewer`: validar autenticación, membership, roles de mutación, containment de carpetas, tokens OAuth y ausencia de bypass de tenant.
- `reviewer`: revisar el diff final y las regresiones.

**Salida:** diff local coherente, tests Drive, typecheck y lint sin errores nuevos, revisión de seguridad y revisión de código aprobadas.

**Gate:** no avanzar a producción si falla cualquier check crítico o si el diff contiene archivos no relacionados sin justificación.

### Fase 1: verificar Drive en producción

**Owner:**

1. Autorizar la cuenta OAuth en producción.
2. Ejecutar upload de un archivo de prueba.
3. Confirmar list y metadata.
4. Renombrar y descargar.
5. Eliminar el archivo.
6. Eliminar el secret OAuth antiguo en Google Cloud.

**Agentes:**

- `general`: preparar checklist y comandos/probes, sin ejecutarlos contra producción.
- `reviewer`: revisar la evidencia y confirmar que cubre todos los estados.

**Salida:** evidencia de CRUD completo y secret legacy eliminado.

### Fase 2: E2E de Grupos y Papelera

**Agentes:**

- `explore`: mapear rutas, estados y datos esperados para captura, agrupación, movimiento, restore y borrado definitivo.
- `general`: preparar una checklist visual y, si es posible, una batería no destructiva local.
- `reviewer`: revisar la evidencia manual y clasificar cualquier fallo.

**Owner:** ejecutar en producción:

1. Capturar un producto real con la extensión.
2. Confirmar que el grupo se crea correctamente.
3. Mover un competidor a otro grupo.
4. Abrir `/trash`.
5. Restaurar una entidad.
6. Verificar borrado definitivo con un elemento de prueba.

**Salida:** flujo documentado en `docs/QA_LOG.md`, sin borrar datos reales no destinados a prueba.

### Fase 3: QA funcional restante en producción

**Agentes:**

- `general`: preparar probes y criterios de aceptación para research capture → DB → UI → reload, extensión con ASINs variados, devoluciones e invalid-data.
- `security-reviewer`: revisar pruebas de aislamiento Org A/Org B y cualquier resultado que implique identifiers o permisos.
- `reviewer`: validar que los resultados no se declaren PASS sin evidencia suficiente.

**Owner:** ejecutar las comprobaciones que necesitan navegador, sesión visual, Seller Central o cuentas reales:

- comparar ASIN, título, precio, BSR, reviews, rating, categoría y marca de varios ASINs;
- comprobar persistencia visual de Research tras reload;
- cambiar explícitamente entre organizaciones y verificar que no haya fuga;
- completar el lifecycle de devoluciones;
- repetir la batería de datos inválidos en producción de forma segura.

**Salida:** cada ítem marcado `PASS`, `PARCIAL` o `BLOCKED` con fecha y evidencia.

### Fase 4: deuda técnica local

Estas tareas pueden paralelizarse solo cuando no compartan archivos ni contratos. Cada una tiene su propio cambio, tests y revisión.

- `general`: validación Zod en SP-API, Drive y Cron.
- `general`: inventario y corrección de queries N+1 y límites del dashboard.
- `general`: accesibilidad de las pantallas priorizadas por QA.
- `general`: i18n de `product-analyzer`.
- `reviewer`: revisión independiente de cada unidad.
- `security-reviewer`: revisión obligatoria de las tareas que toquen API, server-side o datos tenant.

**Salida:** cambios locales pequeños, tests relacionados y actualización de documentación solo cuando cambie el comportamiento.

### Fase 5: bloqueados y baja prioridad

- **Deep Dive Grok:** owner compra créditos xAI y agrega `XAI_API_KEY` en Vercel; después `general` verifica el flujo y `reviewer` valida regresiones.
- **Share:** permanece deshabilitado. Solo se diseña su reactivación después de aprobación de `security-reviewer` para hash de tokens, expiración obligatoria, revocación, rate limit y tests cross-tenant.
- **Ledger SDD:** resolver minors restantes según impacto, sin desplazar QA productivo crítico.
- **LOW:** unificar números duplicados de migraciones y limpiar dependencias, con revisión del impacto.

## Protocolos de handoff

Cada agente debe entregar:

- alcance exacto y archivos tocados;
- comandos ejecutados y resultado;
- decisiones o supuestos;
- riesgos pendientes;
- recomendación de siguiente agente.

El siguiente agente debe leer ese handoff y el diff actual antes de editar. No se deben ocultar fallos mediante cambios de tests, mocks permisivos o relajación de validaciones.

## Criterio de finalización

Una fase se considera cerrada únicamente cuando su salida está presente, el gate correspondiente pasó y los pendientes restantes están clasificados. La finalización global requiere verificación proporcional: tests relacionados para tareas estándar y typecheck, lint, tests, build y revisión completa para fases críticas.
