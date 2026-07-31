# PROMPT_NEXT_SESSION — Checkpoint

---

## Ultima sesion

- **Fecha**: 2026-07-31
- **Resumen**: Motor de Investigacion de Productos implementado completo (14 tareas via subagent-driven-development). Chrome Extension + scoring engine + deep dive GPT-4o + 3 API endpoints + UI en /research. Review final encontro 4 criticos (extension sin host_permissions, endpoints publicos, zip untracked, dominio inventado) — todos fixeados. Push a main: 10 commits.
- **Build**: 0 errores, 211 tests pasando
- **Branch**: main, pusheado (`98df256..40109af`)

## Estado actual

Leer `App State.md` para el snapshot completo. Puntos clave:
- Motor de Investigacion funcional en codigo: extension -> capture -> scoring -> deep dive
- Migration `20260730_add_source_data.sql` creada pero NO aplicada en Supabase prod
- Extension empaquetada en `public/research/extension.zip` (commiteada)
- **PENDIENTE**: usuario reporta que la extension no aparece en SU Chrome (verificada funcional en Playwright — ver [[Bugs Conocidos]])

## Proximos pasos

### 1. Diagnosticar extension en Chrome del usuario (ALTA — bloquea testing)
- Pedir output de `chrome://extensions`: aparece? boton Errors? toggle ON?
- Hipotesis documentadas en [[Bugs Conocidos]]
- El paquete esta verificado OK — es problema de instalacion/entorno

### 2. Aplicar migration source_data en Supabase prod (ALTA)
- `supabase/migrations/20260730_add_source_data.sql`
- Sin esto, el capture endpoint falla al insertar

### 3. Probar flujo E2E del Motor de Investigacion (ALTA)
- Extension en amazon.com -> capturar -> enviar a web -> scoring -> deep dive GPT-4o
- Verificar que H10 Xray detection funciona con la extension de H10 activa

### 4. Minor findings diferidos (MEDIUM/LOW)
- Fallback de enums GPT en DeepDivePanel (`?? moderate`, `?? []`)
- Deep dive accesible desde kanban (hoy solo vista lista)
- i18n en componentes nuevos (strings hardcodeadas en espanol)
- build-extension.ts es Windows-only (PowerShell Compress-Archive)
- Migration filename rompe convencion NNN_ del repo

### 5. Backlog previo (de 2026-07-30)
- Zod validation en SP-API / Drive / Cron routes (MEDIUM)
- N+1 queries fix + dashboard limits (MEDIUM)
- Accessibility fixes (MEDIUM)
- Unificar numeros duplicados de migraciones 014/015 (LOW)

## Archivos clave

- `src/lib/research/` — types, scoring, analyzer (GPT-4o)
- `src/app/api/research/capture|scoring|analyze-deep/` — endpoints del motor
- `src/chrome-extension/` — fuente de la extension (editar aca, NO en public/)
- `src/scripts/build-extension.ts` — `npm run build:extension` regenera el zip
- `.superpowers/sdd/progress.md` — ledger SDD con minor findings completos

## Comandos

```bash
npm run dev              # Desarrollo
npm run build            # Build produccion
npm run lint             # Linting
npm run test:run         # Tests (211)
npm run build:extension  # Regenerar zip de la extension
```

## Vault

- [[00 - Dashboard]] — entry point del segundo cerebro
- [[App State]] — snapshot del proyecto
- [[Bugs Conocidos]] — extension pendiente de diagnostico
- [[Decisiones Tecnicas]] — ADRs
