# Plan: Obsidian Vault - Second Brain

## Reglas
- Todo en español, simple y claro
- Formato Obsidian: markdown, [[wikilinks]], frontmatter, MOCs, etiquetas
- NO archivos vacios: cada uno con contenido inicial
- Esconder node_modules, src, public, .next, etc.

## Archivos a crear

### .obsidian/ (config)
- app.json - config basica
- appearance.json - tema oscuro
- templates.json - carpeta Templates/
- daily-notes.json - carpeta Daily Notes/
- community-plugins.json - plugins vacio

### Templates/ (4 templates)
- Daily Note.md - fecha, que hice, blockers, proximos pasos
- Bug Report.md - titulo, severity, pasos, expected/actual
- Feature Request.md - descripcion, prioridad, estimacion
- Decision Record.md - contexto, decision, consecuencias

### MOC/Index Notes (5 notas)
- 00 - Dashboard.md - Entry point, links a todo
- 01 - App Index.md - ARCHITECTURE, DATABASE, API, MODULES
- 02 - Dev Index.md - CONVENTIONS, UI-PATTERNS, DESIGN_SYSTEM
- 03 - Tasks Index.md - Bugs, features, roadmap
- 04 - Daily Notes/ - Carpeta vacia

### Notas de contenido (3 notas)
- Decisiones Tecnicas.md - Por que Supabase, Next.js, etc.
- Bugs Conocidos.md - Lista de bugs pendientes
- Learning Log.md - Notas de aprendizaje

## Docs existentes que se conectan
- ARCHITECTURE.md → 01 - App Index
- DATABASE.md → 01 - App Index
- API.md → 01 - App Index
- MODULES.md → 01 - App Index
- CONVENTIONS.md → 02 - Dev Index
- UI-PATTERNS.md → 02 - Dev Index
- DESIGN_SYSTEM.md → 02 - Dev Index
- docs/ROADMAP.md → 03 - Tasks Index
