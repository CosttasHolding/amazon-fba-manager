---
tipo: tracking
tags: [bug, problemas]
ultima_actualizacion: 2026-08-01
---

# Bugs Conocidos

> Lista de bugs pendientes o resueltos.

---

## Activos

### Extension no aparece en Chrome del usuario (PENDIENTE DIAGNOSTICO)
- **Fecha**: 2026-07-31
- **Sintoma**: El usuario instala la extension pero no aparece ni en la barra ni en el menu del puzzle
- **Verificado**: El zip `public/research/extension.zip` carga PERFECTO en Playwright/Chromium (enabled, sin errores, ID asignado) — el paquete es valido
- **Hipotesis**: 
  1. Usuario tiene zip viejo (de antes del fix de iconos que Chrome rechazaba)
  2. Carpeta anidada al descomprimir (selecciono la carpeta padre)
  3. Multiples perfiles de Chrome (instalo en uno, mira en otro)
  4. Politica de empresa que bloquea extensiones unpacked
- **Proximo paso**: Pedir al usuario que abra `chrome://extensions` y reporte: si aparece en la lista, si hay boton rojo "Errors", si el toggle esta ON
- **Contexto**: Ver `Daily Notes/2026-07-31.md`

### Deep dive falla por falta de creditos/licencias en xAI (BLOQUEADO)
- **Fecha**: 2026-08-01
- **Sintoma**: `/api/research/analyze-deep` y `/api/research/analyze` devuelven `403 Your newly created team doesn't have any credits or licenses yet`
- **Causa**: la key `XAI_API_KEY` es VALIDA (autenticacion OK, llega a api.x.ai) pero el team no tiene creditos/licencias cargadas
- **Solucion**: comprar creditos en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **Adicional**: XAI_API_KEY solo esta en `.env.local` — falta agregarla en Vercel (prod) o el deep dive fallara en produccion
- **Seguridad**: las keys de OpenAI y xAI quedaron expuestas en el chat del 2026-08-01. **DECISION**: riesgo bajo (sin creditos hoy), rotar cuando el usuario cargue creditos — ahi generar key nueva en vez de usar la expuesta

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
