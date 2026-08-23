---
ultima_actualizacion: 2026-08-22
---

# App State

Snapshot de contexto **no derivable** del repo. Branch, versión, tests, build y commits: se derivan de git/package.json — no registrarlos aquí. Historial de sesiones: `docs/archive/PROMPT_NEXT_SESSION-historial-2026-07_08.md`.

## Objetivo actual

App completa y desplegada. Siguiente frente: QA funcional E2E en prod y pago de deuda técnica (backlog abajo).

## Contexto activo

- **E2E manual en prod pendiente (usuario)**: Grupos+Papelera desplegada (`bbf2dfb` → Vercel auto). Verificar: capturar producto → grupo creado; mover competidor de grupo; `/trash` (restore + borrado definitivo).
- **Deep dive Grok bloqueado**: team xAI sin créditos/licencias (403). Requiere comprar créditos en console.x.ai + agregar `XAI_API_KEY` en Vercel prod. No insistir hasta que el usuario lo pida.
- **Extensión Chrome multi-fuente** (H10/AMZScout/Keepa): completa, verificada E2E con capturas reales (2026-08-05) + fix niche_score (08-07).
- Migraciones 030–035 todas aplicadas en prod (034 research_groups, 035 soft delete).

## Riesgos / decisiones abiertas

- MCP local conecta a producción — tratar mutaciones vía MCP como operaciones sobre prod (detalle: `docs/audits/AI_SYSTEM_AUDIT.md` R1).
- Keys OpenAI/xAI rotadas (confirmado 08-07). Token Vercel de incidente histórico rotado (confirmado 08-22).

## Backlog

- ~25 minors del ledger SDD: `.superpowers/sdd/progress.md`
- MEDIUM: Zod validation en SP-API/Drive/Cron · N+1 queries + dashboard limits · accessibility · i18n product-analyzer
- LOW: unificar números duplicados de migraciones 014/015 · package cleanup

## Enlaces útiles

- [[00 - Dashboard]] · [[Bugs Conocidos]] · [[Decisiones Tecnicas]] · `docs/ROADMAP.md`
