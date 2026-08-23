# MISIÓN

Vas a realizar una **auditoría, optimización y validación integral** del repositorio actual de **Amazon FBA Manager**.

No estás haciendo un simple refactor.

Tu objetivo es transformar el proyecto en un sistema:

1. estable;
2. compatible;
3. mantenible;
4. seguro;
5. optimizado para desarrollo con IA;
6. eficiente en consumo de tokens;
7. portable entre agentes;
8. verificable automáticamente;
9. con documentación confiable;
10. con workflows proporcionales al riesgo;
11. funcionalmente validado de punta a punta.

Debes trabajar **por fases**, usando subagentes especializados cuando reduzcan contexto o aumenten seguridad.

NO ejecutes todas las fases ciegamente.

Primero inspecciona.

Después demuestra.

Después propone.

Después implementa.

Después verifica.

---

# PRINCIPIO CENTRAL

Usa:

> **The cheapest workflow that safely proves the requested change correct. Escalate process with risk and complexity.**

Evita tanto:

- actuar sin analizar;
- como sobreingeniería innecesaria.

No uses 5 subagentes para cambiar un texto.

No hagas un cambio crítico de RLS como si fuera un cambio de CSS.

---

# REGLAS ABSOLUTAS

Estas reglas tienen prioridad sobre cualquier documentación antigua del repositorio.

## 1. Código real > documentación

Nunca asumas que un `.md` representa correctamente el estado actual.

Cuando haya conflicto entre:

1. código;
2. migraciones;
3. configuración;
4. tests;
5. documentación;

considera primero la evidencia ejecutable.

Identifica explícitamente documentación obsoleta.

---

## 2. Search before read

Antes de abrir archivos completos:

1. buscar símbolo;
2. usar grep/glob/LSP;
3. localizar implementación;
4. leer solo los fragmentos relevantes.

No cargar documentación global sin necesidad.

---

## 3. Lazy context

NO leer automáticamente al comenzar:

- Daily Notes;
- Prompt Next Session;
- Dashboard;
- Bugs conocidos;
- App State completo;
- Prompt Maestro antiguo;
- todo `/docs`.

Cargar documentos solo si son relevantes.

Ejemplo:

UI → Design System / UI Patterns.

DB → Database / migrations.

API → API conventions.

Amazon → SP-API docs.

No mezclar contexto irrelevante.

---

## 4. Scope discipline

Modificar:

> **el conjunto mínimo de archivos necesario para completar correctamente la tarea.**

Eliminar cualquier regla artificial tipo:

> máximo 2 archivos.

No realizar refactors oportunistas fuera del scope.

---

## 5. Dependencias

No:

- actualizar;
- instalar;
- eliminar;

dependencias incidentalmente.

Cualquier cambio de dependencia debe:

1. comprobar uso actual;
2. justificar el cambio;
3. comprobar compatibilidad;
4. actualizar lockfile correctamente;
5. ejecutar validaciones relacionadas.

---

## 6. Producción

NO modificar:

- datos de producción;
- RLS de producción;
- secretos;
- credenciales;
- configuración productiva irreversible;

sin aprobación explícita.

No asumir que una DB es de testing.

---

## 7. Git

Permitido sin aprobación:

- `git status`;
- `git diff`;
- inspección de history;
- crear commits locales únicamente si esta misión lo indica y el working tree estaba controlado.

Requieren autorización explícita:

- push;
- force push;
- merge;
- borrar branches remotas;
- rebase destructivo;
- reset destructivo.

Nunca usar `--no-verify` salvo autorización explícita.

---

# INVARIANTE DE SEGURIDAD MÁS IMPORTANTE

Amazon FBA Manager es multi-tenant.

Cualquier código que toque:

- database;
- Supabase;
- API;
- server-side access;
- service role;
- MCP;
- cron;
- automation;
- SP-API;
- queries;
- mutations;

debe comprobar explícitamente:

1. autenticación;
2. organización actual;
3. membership;
4. `org_id`;
5. autorización/rol;
6. impacto de RLS;
7. posibilidad de bypass mediante service role;
8. posibilidad de fuga cross-tenant.

Nunca asumir que RLS por sí solo protege una operación ejecutada con service role.

---

# CÓDIGO FINANCIERO CRÍTICO

`calculations.ts` y cualquier lógica equivalente NO deben tratarse como "inmutables".

Clasificarlos como:

> CRITICAL DOMAIN CODE.

Cambios requieren:

1. motivo explícito;
2. comprensión de fórmula actual;
3. regression test;
4. expected values comprobables;
5. verificación financiera;
6. review independiente.

No cambiar fórmulas incidentalmente durante otra tarea.

---

# CLASIFICACIÓN DE TAREAS

Antes de ejecutar una modificación clasifícala.

## SIMPLE

Ejemplos:

- copy;
- estilos;
- iconos;
- pequeños ajustes locales.

Workflow:

inspect → modify → targeted verify.

---

## STANDARD

Ejemplos:

- componente;
- hook;
- validación;
- endpoint sencillo.

Workflow:

inspect → short plan → implement → related tests → diff review.

---

## COMPLEX

Ejemplos:

- feature;
- varios módulos;
- integración;
- arquitectura.

Workflow:

exploration → spec → plan → implement → review → verification.

---

## CRITICAL

Ejemplos:

- RLS;
- `org_id`;
- auth;
- service role;
- migrations destructivas;
- cálculos financieros;
- seguridad;
- cambios estructurales multi-tenant.

Workflow:

exploration
→ impact analysis
→ specification
→ explicit implementation plan
→ approval gate when risk is irreversible
→ implementation
→ regression/security tests
→ independent review
→ full verification.

---

# SUBAGENTES

No crear subagentes por costumbre.

Usarlos cuando permitan:

- reducir contexto del agente principal;
- paralelizar investigación independiente;
- separar implementación y revisión;
- usar permisos read-only;
- verificar áreas críticas.

Utiliza conceptualmente estos roles.

---

## `explorer`

Read-only.

Objetivo:

- mapear código;
- usar LSP;
- localizar referencias;
- descubrir dependencias entre módulos;
- identificar archivos relevantes.

No edita.

Debe retornar únicamente:

- hallazgos;
- rutas;
- símbolos;
- riesgos;
- preguntas pendientes.

Salida concisa.

---

## `docs-auditor`

Read-only.

Objetivo:

comparar documentación con:

- código;
- migrations;
- package.json;
- tests;
- config.

Clasificar cada documento:

- KEEP;
- FIX;
- MERGE;
- MOVE;
- LAZY LOAD;
- SKILL;
- RULE;
- GENERATED;
- ARCHIVE;
- DELETE CANDIDATE.

No eliminar nada.

---

## `security-reviewer`

Read-only.

Especializado en:

- authentication;
- authorization;
- RLS;
- `org_id`;
- service-role;
- cross-tenant leakage;
- cron;
- automation;
- MCP;
- external integrations.

No implementar.

Debe intentar encontrar maneras en las que Org A pueda afectar/ver datos de Org B.

---

## `test-reviewer`

Read-only cuando analiza.

Responsable de:

- mapear cobertura existente;
- unit;
- integration;
- E2E;
- regression gaps;
- production-build smoke testing;
- critical flows.

Puede proponer tests concretos.

---

## `implementer`

Único subagente que puede realizar cambios importantes.

Debe recibir:

- objetivo;
- scope;
- archivos relevantes;
- invariantes;
- tests esperados;
- definition of done.

Nunca mandarle "arregla el proyecto".

---

## `reviewer`

Read-only.

Se ejecuta DESPUÉS de cambios importantes.

Buscar:

- regresiones;
- scope creep;
- duplicación;
- API changes;
- arquitectura;
- seguridad;
- tenant isolation;
- tests faltantes;
- documentación incorrecta.

No debe corregir el código por su cuenta.

Entrega findings al orquestador.

---

# POLÍTICA DE SUBAGENTES

SIMPLE:

no subagente salvo necesidad.

STANDARD:

usar `explorer` solo si localizar el cambio no es trivial.

COMPLEX:

`explorer` + `implementer` + `reviewer`.

CRITICAL:

`explorer`
+
`security-reviewer` cuando corresponda
+
`implementer`
+
`reviewer`
+
`test-reviewer`.

No duplicar investigación entre agentes.

Cada subagente debe recibir contexto mínimo suficiente.

---

# POLÍTICA DE TOKENS

Cada subagente debe devolver resultados condensados.

Evitar pegar archivos completos.

Preferir:

- `path`;
- symbol;
- función;
- líneas relevantes;
- conclusión.

No repetir en el contexto principal información ya conocida.

No volver a leer un documento completo salvo cambio relevante.

No generar documentación narrativa innecesaria.

Una sola fuente de verdad para cada concepto.

---

# FASE 0 — BASELINE Y SEGURIDAD

NO modificar código todavía.

## 0.1 Estado

Inspeccionar:

- branch;
- working tree;
- package manager;
- Node;
- package-lock;
- scripts;
- CI;
- tests;
- build;
- estructura `.opencode`;
- `opencode.json`;
- `AGENTS.md`.

No destruir cambios existentes.

---

## 0.2 Baseline técnico

Determinar realmente:

- versión requerida de Node;
- Next;
- eslint-config-next;
- TypeScript;
- Vitest;
- Playwright;
- npm;
- tests disponibles;
- build actual.

Existe una hipótesis que debes verificar:

- documentación indica Node 18+;
- Vitest 4 puede exigir Node 20+.

NO cambiar nada hasta verificarlo con las versiones instaladas/documentación pertinente.

---

## 0.3 Baseline de pruebas

Ejecutar únicamente lo razonable para establecer estado inicial.

Registrar:

- typecheck;
- lint;
- unit tests;
- build;
- E2E existente si el entorno lo permite.

Si algo falla antes de nuestros cambios:

marcar:

`PRE-EXISTING FAILURE`.

No atribuirlo a esta misión.

---

## OUTPUT FASE 0

Crear/mostrar un reporte breve:

```text
BASELINE
Node:
Package manager:
Branch:
Working tree:
TypeScript:
Lint:
Unit:
Build:
E2E:
Warnings:
Pre-existing failures:
```

No continuar a cambios destructivos si el baseline es ambiguo.

---

# FASE 1 — AUDITORÍA DEL SISTEMA DE IA

Usar `docs-auditor` + `explorer`.

Analizar:

- `AGENTS.md`;
- `opencode.json`;
- `.opencode/`;
- skills;
- agents;
- commands;
- Superpowers;
- Prompt Maestro;
- Prompt Next Session;
- App State;
- Dashboard;
- Daily Notes;
- Bugs;
- Architecture;
- Database;
- API;
- Modules;
- Conventions;
- Design System;
- UI Patterns;
- Decisions;
- Learning Log;
- Changelog;
- indexes.

---

## Objetivo

Detectar:

- contexto obligatorio innecesario;
- reglas duplicadas;
- documentación contradictoria;
- información derivable;
- documentación histórica utilizada como contexto operativo;
- procesos demasiado rígidos;
- instrucciones incompatibles;
- referencias a archivos inexistentes.

---

## Verificar especialmente

Investigar si siguen existiendo problemas como:

- AGENTS obligando a leer varios documentos al inicio;
- máximo 2 archivos por respuesta;
- TDD para absolutamente todo;
- full build/tests después de cada microfase;
- subagentes obligatorios;
- `calculations.ts` marcado como immutable;
- referencias antiguas a `CLAUDE.md`;
- test counts desactualizados;
- Database docs con conteos inconsistentes.

No asumir que siguen presentes.

Verificarlos en HEAD.

---

## Entregable

Crear:

`docs/audits/AI_SYSTEM_AUDIT.md`

con:

```text
Finding
Evidence
Impact
Risk
Recommendation
Action
```

Y matriz de documentos:

```text
File | Purpose | Authority | Freshness | AI context | Action
```

---

# FASE 2 — DISEÑAR AGENTS V2

NO sobrescribir `AGENTS.md` hasta haber diseñado la nueva versión.

Debe quedar corto.

Objetivo aproximado:

50–100 líneas si es posible.

Debe contener solamente:

1. project identity;
2. invariants;
3. tenant safety;
4. context-loading rules;
5. scope discipline;
6. workflow routing;
7. verification policy;
8. dangerous-action boundaries;
9. pointers a documentación especializada.

NO duplicar:

- API docs;
- database schema;
- design system completo;
- daily history;
- architecture completa.

---

# FASE 3 — DOCUMENTACIÓN JERÁRQUICA

Diseñar estructura antes de mover archivos.

Objetivo conceptual:

```text
docs/
├── architecture/
├── domains/
├── integrations/
├── development/
├── testing/
├── decisions/
├── audits/
├── plans/
└── archive/
```

No reorganizar por estética.

Mover únicamente cuando:

- mejora discoverability;
- elimina ambigüedad;
- permite lazy loading.

---

## ADR

Convertir decisiones técnicas importantes progresivamente a:

```text
ADR-001-...
ADR-002-...
```

Cada ADR:

- contexto;
- decisión;
- consecuencias;
- fecha;
- status.

No convertir cada comentario histórico en ADR.

---

## App State

Eliminar de App State información que pueda derivarse automáticamente:

- branch;
- test count;
- build state;
- package version;

salvo que exista un motivo real.

Conservar:

- current objective;
- unresolved decisions;
- active risks;
- unfinished context.

---

## Daily Notes

DAILY NOTES — SESSION HANDOFF

Daily Notes/ se utiliza como mecanismo de handoff entre sesiones, no como diario exhaustivo de actividad.

Su propósito es permitir que un agente nuevo continúe el trabajo sin tener que redescubrir información importante de la sesión anterior.

Al iniciar una nueva sesión

Leer únicamente la Daily Note más reciente si existe y contiene contexto activo.

NO leer notas históricas anteriores salvo que una tarea específica requiera investigar el pasado.

La Daily Note nunca reemplaza al código, Git, tests o documentación authoritative.

Qué registrar

Registrar únicamente información que sea importante para la próxima sesión y que no pueda deducirse fácilmente del repositorio.

Ejemplos:

trabajo incompleto;
siguiente paso concreto;
bug todavía abierto;
investigación parcialmente realizada;
hipótesis pendiente de comprobar;
decisión técnica tomada durante la sesión;
riesgo descubierto;
workaround temporal;
bloqueo externo;
archivo o módulo dejado en estado intermedio;
test que continúa fallando y causa conocida;
contexto imprescindible para retomar una implementación.
Qué NO registrar

No registrar información derivable automáticamente como:

branch actual;
listado completo de archivos modificados;
número actual de tests;
build status histórico;
commits realizados;
versión de package.json;
comandos ejecutados;
narración cronológica de la sesión;
información ya registrada en documentación authoritative.

Git, código, tests y configuración son la fuente de verdad para esos datos.

Formato

Mantener cada Daily Note corta y accionable.

Usar solamente las secciones necesarias:

Pendiente crítico

Trabajo que quedó incompleto o requiere atención inmediata.

Decisiones

Decisiones tomadas durante la sesión que afecten trabajo futuro.

Bugs / riesgos

Problemas conocidos que siguen abiertos.

Contexto imprescindible

Información que el próximo agente no podría inferir rápidamente.

Próximo paso

Acciones concretas recomendadas para continuar.

Bloqueos

Factores externos o internos que impiden continuar.

No crear secciones vacías.

Al finalizar una sesión

Antes de terminar, determinar:

¿Existe información que una nueva sesión necesitaría conocer para continuar correctamente?

Si NO:

no crear ni actualizar Daily Note solamente por obligación.

Si SÍ:

actualizar la Daily Note del día con el mínimo contexto suficiente.

Regla de tamaño

Una Daily Note debe ser un handoff, no documentación permanente.

Preferir aproximadamente:

5–30 líneas normalmente;
excepcionalmente más si una investigación compleja quedó incompleta.

Si una explicación empieza a necesitar mucho detalle, mover ese conocimiento a su documento authoritative y dejar en la Daily Note solamente un enlace/referencia y el estado actual.

Promoción de conocimiento

Si algo deja de ser temporal y pasa a ser una regla o decisión permanente:

Daily Note
→ documento authoritative.

Ejemplos:

decisión arquitectónica
→ ADR.

regla de código
→ CONVENTIONS.

comportamiento de DB
→ DATABASE.

procedimiento reusable
→ Skill.

bug de largo plazo
→ Bugs Conocidos.

La Daily Note puede entonces eliminar el detalle y apuntar a esa fuente.

Principio

La Daily Note responde únicamente:

¿Qué necesita saber el próximo agente que no descubriría rápidamente mirando el estado actual del repositorio?

---

# FASE 4 — SKILLS

Crear skills solo si el formato actual de OpenCode instalado lo soporta.

Primero inspeccionar configuración/documentación del proyecto.

No inventar keys o estructura de config.

Skills iniciales candidatas:

```text
feature
bug-fix
database-change
tenant-security
ui-change
api-change
critical-calculation
verification
```

Cada skill debe ser pequeña.

No duplicar AGENTS.

Debe explicar únicamente el procedimiento especializado.

---

# FASE 5 — AGENTES Y PERMISOS

Inspeccionar cómo la versión actual de OpenCode define:

- agents;
- permissions;
- tools;
- LSP;
- skills;
- bash rules.

NO adivinar schemas.

Configurar, si es compatible:

### Explorer

read-only.

### Reviewer

read-only.

### Implementer

write enabled.

### Security Reviewer

read-only.

Mantener configuración lo más pequeña posible.

---

## Permisos deseados

Conceptualmente:

```text
read        allow
grep        allow
glob        allow
lsp         allow

edit:
implementer allow
reviewer    deny
explorer    deny
security    deny
```

Operaciones peligrosas:

```text
git push
destructive DB
credential operations
production mutations
```

deben requerir aprobación o estar bloqueadas.

---

# FASE 6 — SUPERPOWERS

NO eliminar Superpowers automáticamente.

Auditar qué prácticas aportan valor.

Conservar conceptos como:

- systematic debugging cuando existe un bug difícil;
- verification before completion;
- planning para cambios complejos;
- independent review.

Eliminar su activación obligatoria para tareas triviales.

Superpowers debe ser:

> toolbox.

No:

> ceremony mandatory for every action.

---

# FASE 7 — TOOLCHAIN Y COMPATIBILIDAD

Auditar:

- `package.json`;
- engines;
- lockfile;
- Next;
- eslint-config-next;
- TypeScript;
- Vitest;
- Playwright;
- ESLint;
- build;
- Node;
- dependencies posiblemente no usadas.

---

## Node

Determinar requisito efectivo.

Si Node 18 no soporta el conjunto actual de herramientas, actualizar documentación/configuración para reflejar el mínimo real.

Preferir declarar:

- `engines`;
- `.nvmrc` o equivalente;

si aporta reproducibilidad.

---

## Next / ESLint

Comprobar compatibilidad entre:

- `next`;
- `eslint-config-next`.

No actualizar major versions en esta misión.

---

## Dependencias

Buscar:

- imports;
- dynamic imports;
- config;
- scripts;

antes de marcar una dependencia como unused.

No eliminar paquetes únicamente porque parezcan redundantes.

---

# FASE 8 — ARQUITECTURA DEL CÓDIGO

Auditar hotspots.

Especialmente:

- `use-data.ts`;
- `types/index.ts`;
- handlers centrales;
- utils catch-all;
- API routes;
- imports circulares;
- duplicación.

No realizar un mega-refactor.

Objetivo:

definir reglas para que la deuda NO siga aumentando.

Por ejemplo:

nuevos hooks → preferir dominio específico.

nuevos types → preferir dominio específico.

Migrar código viejo únicamente cuando una feature futura lo toque o exista beneficio demostrable.

---

# FASE 9 — SEGURIDAD MULTI-TENANT

Esta fase es CRÍTICA.

Ejecutar `security-reviewer`.

Auditar:

- migrations;
- RLS policies;
- `org_id`;
- `user_id`;
- memberships;
- API handlers;
- service role;
- cron;
- automation;
- MCP;
- SP-API;
- webhooks;
- public/shared endpoints.

Construir una matriz:

```text
Resource
Authenticated?
Org scoped?
Role checked?
RLS?
Service role?
Cross-tenant risk?
Test coverage?
```

---

## Constraints

Revisar constraints legacy.

Ejemplo conceptual:

```text
UNIQUE(user_id, sku)
```

versus diseño actual multi-org.

No cambiarlo solo por sospecha.

Determinar:

- comportamiento deseado;
- uso real;
- compatibilidad;
- migration impact.

---

## Gate

Cualquier cambio de:

- RLS;
- constraint;
- production schema;
- tenant identity;

requiere plan explícito antes de implementación.

---

# FASE 10 — TESTING STRATEGY

Construir verificación proporcional al riesgo.

NO:

```text
cada microcambio
→ tsc
→ lint
→ todos los tests
→ build
```

Usar:

### UI simple

targeted type/lint.

### Hook/business logic

related unit tests.

### API

API-related tests.

### Bug

regression test.

### Finance

financial unit tests.

### DB/RLS

DB + tenant security tests.

### Auth

auth/RLS + relevant E2E.

### Feature grande

full suite.

### Pre-merge/release

typecheck
+
lint
+
unit
+
production build
+
critical E2E.

---

# FASE 11 — TESTING FUNCIONAL CON DATOS REALES

Existe un plan de QA funcional cuyo objetivo es comprobar que las funciones trabajan con datos reales y no valores fijos, cacheados incorrectamente o hardcodeados.

El script actual `scripts/e2e-full-test.py` puede validar que las páginas cargan, pero eso NO demuestra contenido ni CRUD.

Debes extender esa filosofía hacia validaciones funcionales reales.

---

## QA 0 — Preparación

Antes de probar datos reales:

1. identificar ambiente seguro;
2. NO asumir producción;
3. disponer de org/usuario de prueba;
4. crear:

`docs/QA_LOG.md`

Campos:

```text
Módulo
Función
Dato utilizado
Resultado esperado
Resultado obtenido
Estado
Fecha
Evidence
```

No incluir secretos.

---

# QA 1 — REAL DATA VALIDATION

Prioridad máxima.

Verificar que los valores cambian de acuerdo con la entrada real.

---

## Chrome extension

Probar varios ASINs reales diferentes.

Comparar:

- asin;
- title;
- price;
- BSR;
- review count;
- rating;
- category;
- brand.

Detectar:

- fallback constante;
- selector roto;
- cache incorrecto;
- locale parsing.

Especialmente:

`parseLocalizedNumber`.

Validar formatos como:

```text
$1,299.99
$9.99
```

y formatos realmente soportados por la aplicación.

---

## Research capture API

Comprobar:

capture
→ API
→ Supabase
→ research UI
→ reload
→ persistence.

Nunca asumir que un `200` significa que la operación funcionó.

---

## Integraciones

Cuando existan y estén configuradas:

### SP-API

Comparar datos con Seller Central.

### Keepa

Verificar variación real si está integrado.

### Google Drive

Upload real
→ listado
→ metadata
→ delete
→ confirmación real.

No forzar una integración si no está configurada.

Registrar `NOT CONFIGURED`, no `FAIL`.

---

# QA 2 — CRUD POR MÓDULO

Probar:

Create
→ Read
→ Update
→ Delete/Archive
→ Restore si corresponde.

Módulos candidatos:

1. Products
2. Suppliers
3. Inventory
4. Purchase Orders
5. Shipments
6. Sales
7. Finances/Expenses
8. PPC/Ads
9. Reimbursements
10. Returns
11. Payouts
12. Forecasting
13. Alerts
14. Analytics/Dashboard
15. Calculator
16. Tasks/Team/Members
17. Import
18. Trash
19. Governance
20. Share

Primero comprobar cuáles existen actualmente.

No inventar módulos por documentación vieja.

---

# QA 3 — AUTOMATIONS

Verificar efecto real de:

- `/api/automation/*`;
- cron;
- SP-API webhooks;
- push notifications;
- `/api/mcp`.

Un HTTP `200` NO es suficiente.

Debe existir efecto observable correcto.

---

# QA 4 — CROSS-MODULE FLOWS

## Flow A — Purchase lifecycle

Conceptualmente:

Research
→ Product
→ Supplier
→ Purchase Order
→ Received
→ Inventory increases
→ Sale
→ Inventory decreases
→ Finance
→ Dashboard.

En cada salto comprobar consistencia matemática.

---

## Flow B — Incident lifecycle

Sale
→ Return
→ Inventory
→ Reimbursement
→ Finance net result.

---

# QA 5 — EDGE CASES

Prioridad:

## Multi-org

Con dos organizaciones de testing:

Org A jamás debe acceder a Org B.

Probar:

- UI;
- API;
- direct identifier manipulation;
- server operations;
- service-role mediated paths cuando sea seguro;
- shares según diseño.

---

## Rate limiting

Comprobar que el límite configurado realmente se aplica.

No asumir que sigue siendo exactamente `60 req/min`.

Descubrir primero configuración actual.

---

## Invalid data

Probar:

- empty;
- special chars;
- decimals;
- negative;
- future dates;
- malformed IDs;
- invalid relationships.

Esperar error controlado, no corrupción.

---

## Offline/PWA

Validar el comportamiento que el producto realmente promete.

No inventar soporte offline inexistente.

---

# QA 6 — AUTOMATED REGRESSION

Una vez probado manualmente un flujo:

automatizar lo que tenga alto valor de regresión.

Extender E2E para comprobar:

- contenido;
- valores;
- comportamiento;
- mutaciones;

no solamente:

> la página carga.

Priorizar:

- tenant isolation;
- calculations;
- inventory;
- research capture;
- business critical flows.

---

# QA LOG

Después de cada prueba real registrar evidencia.

No poner secretos.

Estados permitidos:

```text
PASS
FAIL
WARN
BLOCKED
NOT CONFIGURED
NOT APPLICABLE
```

Todo `FAIL` debe generar:

- reproducción;
- expected;
- actual;
- severity;
- probable layer;
- regression test candidate.

---

# BUG FIX LOOP

Cuando QA encuentre un bug:

NO arreglar inmediatamente a ciegas.

Ejecutar:

```text
reproduce
→ locate
→ root cause
→ regression test when valuable
→ fix
→ targeted verification
→ reviewer
→ QA retest
```

Registrar resultado.

---

# DEFINITION OF DONE

Una fase no está terminada porque:

- compiló;
- el agente dice que funciona;
- la UI cargó;
- un endpoint devolvió 200.

Está terminada cuando existe evidencia proporcional al riesgo.

---

# DOCUMENTATION POLICY

Actualizar documentación únicamente si cambió:

- comportamiento;
- arquitectura;
- workflow;
- contrato;
- config;
- decisión.

No crear Daily Note automáticamente por cada microcambio.

No actualizar 8 documentos diciendo lo mismo.

---

# CHANGELOG

Actualizar solo cambios significativos para producto/desarrollo.

No usar changelog como log de actividad interna del agente.

---

# REPORTES POR FASE

Al terminar cada fase responde usando:

```text
PHASE N — [NAME]

Status:
PASS / PARTIAL / BLOCKED

Analyzed:
- ...

Changes:
- ...

Evidence:
- ...

Tests:
- ...

Risks:
- ...

Documentation:
- ...

Next:
- ...
```

Máximo detalle útil.

No narrar todos los tool calls.

---

# CHECKPOINTS

No necesito aprobar cada microacción.

Continuar automáticamente entre tareas reversibles de bajo riesgo.

DETENERSE y pedirme aprobación antes de:

1. migration destructiva;
2. cambio crítico de RLS;
3. producción;
4. borrar documentación masivamente;
5. major dependency upgrade;
6. cambio financiero cuyo comportamiento esperado sea ambiguo;
7. push/merge;
8. acción irreversible.

---

# REGLA DE EVIDENCIA

Nunca digas:

> "ya está".

sin especificar cómo lo verificaste.

Si no pudiste probar algo:

decir exactamente:

> UNVERIFIED

y explicar qué falta.

---

# REGLA CONTRA ALUCINACIONES

Nunca inventar:

- archivos;
- endpoints;
- env vars;
- tablas;
- migrations;
- APIs;
- OpenCode config keys;
- MCP tools;
- permisos;
- comandos.

Descubrirlos primero.

---

# PORTABILIDAD

Mantener separado:

## Portable project knowledge

```text
AGENTS.md
docs/
tests/
architecture
specifications
ADRs
```

de:

## OpenCode-specific

```text
.opencode/
opencode.json
agents
skills
commands
permissions
```

El repositorio debe seguir siendo comprensible si mañana se usa:

- OpenCode;
- Codex;
- Claude Code;
- Cursor;
- Copilot;
- otro agente.

---

# OBJETIVO FINAL DE DOCUMENTACIÓN

Cada concepto debe tener UNA fuente de verdad.

Ejemplo:

```text
Database → database docs + migrations
Architecture → architecture docs
Coding conventions → conventions
UI → design system
Decisions → ADRs
Historical work → archive/daily notes
AI behavior → AGENTS
Specialized workflow → skills
```

---

# OBJETIVO FINAL DE OPENCode

Queremos aproximadamente:

```text
                    OpenCode
                       │
                    AGENTS
                       │
                Task classifier
                       │
        ┌──────────────┼──────────────┐
       UI             API             DB
        │              │              │
      skill          skill          skill
        │              │              │
        └──────────────┼──────────────┘
                       │
                relevant context
                       │
                    change
                       │
                 verification
                       │
                    review
```

No:

```text
AGENTS
→ todo el vault
→ todo docs
→ todo history
→ todo skills
→ 5 agents
→ recién después código
```

---

# RESULTADOS FINALES REQUERIDOS

Al completar la misión quiero:

## 1. `AI_SYSTEM_AUDIT.md`

Qué estaba mal y por qué.

---

## 2. `AGENTS.md` optimizado

Pequeño, portable y authoritative.

---

## 3. OpenCode configuration

Solo configuración válida para la versión instalada.

---

## 4. Skills

Solo las que aporten valor real.

---

## 5. Agents

Pocos y especializados.

---

## 6. Documentation map

Qué:

- quedó;
- se corrigió;
- se fusionó;
- se movió;
- se archivó.

---

## 7. Compatibility report

Node/dependencies/toolchain.

---

## 8. Security report

Especialmente multi-tenant/RLS.

---

## 9. Testing strategy

Risk-based.

---

## 10. `QA_LOG.md`

Con las pruebas funcionales ejecutadas.

---

## 11. Regression improvements

Tests añadidos porque encontraron valor real.

---

## 12. Final report

Con:

```text
Critical findings
High findings
Medium findings
Low findings

Fixed
Remaining
Blocked
Unverified
```

---

# SCORE FINAL

Evaluar antes/después:

```text
AI context efficiency
Token efficiency
Documentation clarity
Documentation trustworthiness
Workflow overhead
AI portability
Change safety
Tenant safety
Testing quality
Toolchain reproducibility
Architecture maintainability
```

No inventar porcentajes.

Justificar cada score con evidencia.

---

# ORDEN DE EJECUCIÓN

Ejecutar exactamente en este orden:

```text
PHASE 0
Baseline

PHASE 1
AI system audit

PHASE 2
AGENTS v2 design

PHASE 3
Documentation architecture

PHASE 4
Skills

PHASE 5
Agents + permissions

PHASE 6
Superpowers optimization

PHASE 7
Toolchain compatibility

PHASE 8
Code architecture hotspots

PHASE 9
Tenant/RLS security

PHASE 10
Testing strategy

PHASE 11
Functional QA preparation

PHASE 12
Real-data verification

PHASE 13
Module CRUD QA

PHASE 14
Automations/integrations QA

PHASE 15
Cross-module QA

PHASE 16
Edge cases + multi-org

PHASE 17
Regression automation

PHASE 18
Final verification

PHASE 19
Final report
```

---

# IMPORTANTE: PRIMERA EJECUCIÓN

Al recibir este prompt NO empieces modificando `AGENTS.md`.

Primero ejecuta únicamente:

```text
PHASE 0
+
PHASE 1
```

Usa subagentes read-only.

Contrasta esta misión con el estado REAL de `HEAD`.

Al terminar, presenta:

1. baseline;
2. findings confirmados;
3. findings de esta misión que ya no aplican;
4. riesgos nuevos;
5. propuesta concreta para PHASE 2–6;
6. archivos que modificarías;
7. archivos que NO tocarías;
8. estimación cualitativa de impacto en contexto/tokens.

Después continúa automáticamente con PHASE 2–6 únicamente si no existe ningún hallazgo que cambie materialmente el diseño.

Si aparece una contradicción importante, detenerse y explicarla antes de migrar.

---

# FILOSOFÍA FINAL

No optimices para producir más archivos.

No optimices para usar más agentes.

No optimices para seguir una metodología.

Optimiza para:

> **correctness + stability + maintainability + security + minimum necessary context.**

El mejor sistema de IA para este proyecto es aquel que necesita leer menos, entiende mejor qué debe leer, modifica menos cosas innecesarias y puede demostrar que lo que cambió sigue funcionando.