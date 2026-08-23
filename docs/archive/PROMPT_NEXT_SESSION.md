# PROMPT_NEXT_SESSION — Contexto activo

> Handoff mínimo. Historial de sesiones cerradas: `docs/archive/PROMPT_NEXT_SESSION-historial-2026-07_08.md`. Snapshot general: `App State.md`.

## Pendientes activos

1. **E2E manual en prod de Grupos+Papelera** (pendiente desde 08-21): capturar con la extensión → verificar grupo creado; mover competidor de grupo; probar `/trash` (restore + borrado definitivo).
2. **Backlog**: ~25 minors del ledger SDD (`.superpowers/sdd/progress.md`) + MEDIUMs (Zod validation en SP-API/Drive/Cron, N+1 queries, accessibility, i18n product-analyzer).

## FILOSOFIA DE TRABAJO (vigente desde 2026-08-03)

- Prioridad: terminar TODA la app primero; pagos/membresías (xAI, etc.) al final.
- PENDIENTES BLOQUEADOS POR FALTA DE API KEY (**NO recordar al usuario hasta que ÉL lo pida**):
  - Deep dive Grok (`XAI_API_KEY` + créditos xAI; falta también agregarla en Vercel prod).
  - Rotar keys OpenAI/xAI expuestas en chat 08-01 — solo cuando el usuario pida.
- No trabajar la lista de arriba por iniciativa propia.
