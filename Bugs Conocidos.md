---
tipo: tracking
tags: [bug, problemas]
ultima_actualizacion: 2026-08-01
---

# Bugs Conocidos

> Lista de bugs pendientes o resueltos.

---

## Activos

### Deep dive falla por falta de creditos/licencias en xAI (BLOQUEADO)
- **Fecha**: 2026-08-01
- **Sintoma**: `/api/research/analyze-deep` y `/api/research/analyze` devuelven `403 Your newly created team doesn't have any credits or licenses yet`
- **Causa**: la key `XAI_API_KEY` es VALIDA (autenticacion OK, llega a api.x.ai) pero el team no tiene creditos/licencias cargadas
- **Solucion**: comprar creditos en https://console.x.ai/team/db62d709-49a7-4db0-a4cd-d58a3921a13c
- **Adicional**: XAI_API_KEY solo esta en `.env.local` — falta agregarla en Vercel (prod) o el deep dive fallara en produccion
- **Seguridad**: las keys de OpenAI y xAI quedaron expuestas en el chat del 2026-08-01. **DECISION**: riesgo bajo (sin creditos hoy), rotar cuando el usuario cargue creditos — ahi generar key nueva en vez de usar la expuesta

---

## Resueltos

### Extension no se podia instalar: descarga servia HTML en vez del zip
- **Fecha**: 2026-07-31 (reportado) / 2026-08-01 (diagnosticado y arreglado)
- **Sintoma**: El usuario descargaba `extension.zip` desde la web y Chrome la rechazaba — "ni siquiera pude instalarla"
- **Causa raiz**: La URL de descarga era `/research/extension.zip` (archivo en `public/research/`) pero el deploy de produccion era VIEJO (anterior al commit que agrego el zip). Vercel no tenia el archivo estatico → la peticion caia al middleware → redirect a /login → el navegador descargaba la pagina HTML (16KB) con nombre `.zip` → Chrome la rechazaba
- **Evidencia**: `/LOGO.png` → 200 directo (estaticos se sirven sin auth); `/research/extension.zip` → 307 a /login (no existe el archivo en el deploy); zip commiteado en HEAD: VALIDO y trackeado → el deploy no incluia el commit
- **Fix**: zip movido a `public/extension.zip` (raiz, sin colision con rutas de app), link de descarga actualizado a `/extension.zip`, `build-extension.ts` ahora genera `public/extension.zip`. Commit `91df13f` + `dd67f31` pusheados → Vercel redeployo
- **Nota**: el middleware corre antes que los estaticos en esta app (matcher no excluye `.zip`), asi que descarga anonima da 307; un usuario logueado recibe el archivo. Verificacion E2E pendiente con el usuario (verificar que el archivo descargado sea ~5.5KB, no HTML)

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
