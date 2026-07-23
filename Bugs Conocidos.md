---
tipo: tracking
tags: [bug, problemas]
ultima_actualizacion: 2026-07-22
---

# Bugs Conocidos

> Lista de bugs pendientes o resueltos.

---

## Activos

### 

_No hay bugs activos reportados actualmente._

---

## Resueltos

### Logo no se ve en Vercel
- **Fecha**: 2026-07-22
- **Causa**: `.vercelignore` tenia `*.png` que excluia el logo
- **Solucion**: Removido `*.png` de `.vercelignore`

### Logo no carga por CSP
- **Fecha**: 2026-07-22
- **Causa**: `Cross-Origin-Embedder-Policy: credentialless` bloqueaba `next/image`
- **Solucion**: Cambiado a `<img>` nativo

### Settings no guarda
- **Fecha**: 2026-07-22
- **Causa**: API filtraba por `org_id` pero `user_settings` no tiene esa columna
- **Solucion**: Cambiado a filtro por `user_id`

### Cotizaciones no se sync entre dispositivos
- **Fecha**: 2026-07-22
- **Causa**: Datos guardados en `localStorage` (por dispositivo)
- **Solucion**: Movido todo a `user_settings` en la DB

---

## Como agregar un bug

1. Copia el template `Bug Report` desde Templates
2. Pegalo en esta nota o crea una nota nueva
3. Llena los campos
4. Cuando se resuelva, movelo a "Resueltos"
