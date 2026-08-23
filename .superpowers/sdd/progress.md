# SDD Progress Ledger - research grupos por item + papelera global

Base commit: `e4f6ff2`
Plan: `docs/superpowers/plans/2026-08-14-research-groups-trash.md`
Spec: `docs/superpowers/specs/2026-08-14-research-groups-trash-design.md`

## Completed
- Spec escrita y commiteada (851c06e)
- Plan escrito y commiteado (e4f6ff2)
- Task 1: migraciones 034/035 (f7b092d, review clean)
- Task 2: helper trash.ts (38b0e23, review clean)

## In Progress

## Minor Findings
- Task 2: `normalizeTable("sales" as never)` en el test viene del brief (cast innecesario, smell latente). Opcional: sacarlo en fix futuro.
- Task 2: archivos sin newline final (no hay prettier config en el repo).
## Preflight scan (sesion 2026-08-21, base 3ee0f7d)
- [Task3] Test fixture CapturedProduct incompleto (faltan bsr/review_count/etc.) → Ruling: implementer completa fixture con nulls/defaults; no cambia aserciones.
- [Task3→4] classifyToGroup importa dinamicamente grok-group.ts (TS2307 si Task 3 va sola) → Ruling: dispatch COMBINADO Tasks 3+4, orden de commits INVERTIDO (grok-group primero, grouping despues) para mantener tsc verde en cada commit. Mensajes de commit segun plan.
- [Task4] product.searchKeyword no existe en CapturedProduct → Ruling: enviar search_keyword: null literal en el prompt JSON.
- [Task3] GroupLike sin amazon_category → el propio plan lo corrige en nota; va al brief.
- Scan interfaces: CapturedProduct OK (types.ts), getXAIClient() existe en src/lib/ai/client.ts.

Task 4: complete (commits 3ee0f7d..c66858e, review clean)
Task 3: complete (commits c66858e..8652ee0, review clean)
Task 3-4: Ruling: desvios de fixture aceptados (source 'scraper' por union real de CapturedProduct; category 'Foam Rollers' para que el caso nicho+nombre sea posible) - verificados por reviewer
Task 3-4: minor (deferred): guard muerto en grok-group (getXAIClient nunca retorna null; 'XAI no configurado' no emerge) - resolver en task futura sobre client.ts
Task 3-4: minor (deferred): sin tests del path classifyToGroup ai='grok' (exito mapeado ni caida a fallback)
Task 3-4: minor (deferred): tokensEq laxo por diseno (1 token compartido = match) - revisar al activar IA/fallback en prod

Task 5: complete-pendiente-fix (commits 8652ee0..2ea5b5f, review Approved con 1 Important plan-mandated)
Task 5: Ruling: restore NO resucita productos soft-deleteados individualmente -> filtrar por deleted_at >= deleted_at del grupo (timestamp compartido lo habilita); alineado a spec 'van juntos a papelera'
Task 5: Ruling: path param [id] en vez de ?id= de Interfaces (plan se contradecia Files vs Interfaces; patron REST del codebase; sin consumidores)
Task 5: minor (deferred): PUT {} devuelve 500 en vez de 400 (heredado patron research)
Task 5: minor (deferred): body JSON malformado -> 500 en vez de 400 (heredado)
Task 5: minor (deferred): schema Zod duplicado entre routes - extraer a validations futuro
Task 5: minor (deferred): mock permisivo single/maybeSingle en tests DELETE
Task 5: fix round 1/5 dispatch (1 open: restore selectivo)

Task 5: fix round 1/5 (1 addressed, 0 open; commits 2ea5b5f..839ffbb)
Task 5: complete (commits 8652ee0..839ffbb, review clean tras 1 fix round)
Task 5-fix1: minor (deferred): cast innecesario GroupTrashRow en restore
Task 5-fix1: minor (deferred): UPDATE redundante sobre grupo activo en restore (documentado, idempotente)
Task 6: Ruling preflight: NO modificar src/app/api/research/route.ts ('o endpoint nuevo' - la ruta nueva replica el patron como hicieron groups/*)
Task 6: Ruling preflight: validar que el grupo destino pertenezca a la org cuando group_id != null (integridad multi-tenant; FK sola no lo bloquea)

Task 6: complete-pendiente-fix (commits 839ffbb..f8cd87c, review Approved con 1 Important plan-mandated)
Task 6: Ruling: agregar filtro .is('deleted_at', null) al update - producto en papelera no debe poder moverse de grupo (integridad con restore selectivo); fix ahora por ser trivial y de integridad
Task 6: minor (deferred): error de DB conflua a 404 en update (referencia distingue 500)
Task 6: minor (deferred): error del pre-check de grupo ignorado (heredado de referencia)
Task 6: minor (deferred): sin cobertura de paths 400/401
Task 6: fix round 1/5 dispatch (1 open: filtro deleted_at)

Task 6: fix round 1/5 (1 addressed, 0 open; commits f8cd87c..161193d)
Task 6: complete (commits 839ffbb..161193d, review clean tras 1 fix round)

Task 7: complete (commits 161193d..dbbabd3, review clean)
Task 7: minor (deferred): DELETE/restore no exigen fila en papelera (guard heredado del patron)
Task 7: minor (deferred): sin test de ruta q uuid/no-uuid sobre entidad id-mapeada
Task 7: minor (deferred): wildcards ilike sin escapar
Task 7: minor (deferred): resolveEntity duplicado entre routes - mover a trash.ts futuro
Task 7: minor (deferred): codigos null listan name ''

Task 8: complete (commits dbbabd3..ebb296b, review clean)
Task 8: minor (deferred): grupo huerfano si falla insert del producto tras crear grupo (sin cleanup compensatorio)
Task 8: minor (deferred): rama none/fallback sin test e inalcanzable con ai=off
Task 8: minor (deferred): ClassifyGroup local duplica GroupLike - exportar upstream en task futura
Task 8: minor (deferred): casts as GroupRow[]/GroupEcho sobre respuestas sin tipo
Task 8: minor (deferred): race cross-request duplica grupos (lookup-then-insert preexistente)

Task 9: complete (commits ebb296b..92c5acb, review clean)
Task 9: minor (deferred): unificar tono borrar/eliminar en es.json trash
Task 9: minor (deferred): label product_suppliers podria ser mas claro (es)
Task 9: minor (deferred): quirk pre-existente language.ar solo en ar.json

Task 10: complete (commits 92c5acb..7080170, review clean)
Task 10: minor (deferred): agregar group_id?: string | null a ProductResearch en types
Task 10: minor (deferred): copy de error al mover reusa key de estado
Task 10: minor (deferred): EmptyState ambiguo cuando filtros vacian la vista
Task 10: minor (deferred): aria-label estatico del sort

Task 11: complete (commits 7080170..1f1e838, review clean)
Task 11: minor (deferred): fechas ar formateadas como es-ES
Task 11: minor (deferred): skeleton flash al cambiar filtros
Task 11: minor (deferred): error de carga conflacionado con vacio
Task 11: minor (deferred): carrera de respuestas sin abort
Task 12: ejecuta orquestador directamente (verificacion fresca + protocolo vault)
Task 12: verificacion final con evidencia fresca: tsc exit 0 | lint solo warnings pre-existentes | 391/391 tests (47 archivos) | build OK (/trash 8.19 kB) | build:glossary OK (57 terminos, sin diff)
Task 12: complete - FEATURE COMPLETA (Tasks 1-12; codigo en 3ee0f7d..1f1e838; pendiente push por decision del usuario)
