---
tipo: personal
tags: [learning, aprendizaje]
ultima_actualizacion: 2026-07-31
---

# Learning Log

> Notas de aprendizaje, descubrimientos, y cosas utiles que fui encontrando.

---

## Supabase

- **RLS (Row Level Security)**: Permite controlar acceso a filas directamente en PostgreSQL. Sin RLS, cualquier usuario autenticado podria ver todos los datos.
- **`createClient()`**: En Next.js App Router, se usa `@supabase/ssr` para manejar cookies correctamente entre Server y Client Components.
- **Storage Buckets**: Para subir archivos (avatars, imagenes), primero crear el bucket en Supabase Dashboard → Storage, luego configurar RLS policies.

## Next.js

- **Server Components**: Por defecto, todos los componentes en `app/` son Server Components. No necesitan `"use client"`.
- **`force-dynamic`**: Necesario en API routes para evitar cache en Vercel (sino, devuelve datos stale).
- **`next/image`**: Requiere que los dominios esten en `next.config.js` → `images.remotePatterns`. Alternativa: usar `<img>` nativo para assets locales.

## Tailwind

- **CSS Variables**: Siempre usar `bg-background`, `text-foreground`, etc. Nunca `bg-white` o `bg-gray-*`.
- **Dark mode**: Se controla via clase `dark` en `<html>` + variables CSS en `globals.css`.

## Patrones

- **Server Actions**: Para mutations simples, usar `src/lib/actions/[entity].ts` con `"use server"`.
- **API Routes**: Para endpoints complejos, usar `src/app/api/[entity]/route.ts` con `createApiHandler`.
- **SWR**: Para datos que se refrescan, usar `useSWR` con `refreshInterval` en el hook.

## Chrome Extensions (2026-07-31)

- **chrome://extensions usa shadow DOM**: `document.body.innerText` NO ve el contenido de la pagina de extensiones. Los selectores de Playwright si lo atraviesan (`extensions-item #name`).
- **chrome.runtime en MV3**: No es accesible desde el main world de la pagina (solo desde content scripts en isolated world). No usar `page.evaluate(chrome.runtime...)` para testear inyeccion.
- **Compress-Archive**: Genera zips validos para Chrome, pero es Windows-only. `bestzip` con glob `dist/*` NO expande globs en Windows (execSync no pasa por shell con expansion).
- **Extension sin iconos**: Chrome carga igual (usa icono default de puzzle). Pero si el manifest REFERENCIA iconos que no existen, RECHAZA la carga.
- **host_permissions**: Para que una extension pueda fetchear la web app con cookies (`credentials: "include"`), el dominio destino debe estar en `host_permissions` — sino CORS bloquea y las cookies SameSite=Lax no viajan.
- **Verificacion de extensiones con Playwright**: `chromium.launchPersistentContext` con `--load-extension` permite testear carga real: verificar `extensions-item`, boton de errores y toggle enabled.

## Subagent-Driven Development (2026-07-31)

- **Review final whole-branch vale oro**: encontro 4 criticos que los reviews por tarea no vieron (dominio inventado en el plan, endpoint publico, zip untracked, host_permissions).
- **El plan puede tener errores**: el dominio `fba-manager.vercel.app` del plan era inventado; el real estaba en README/CONVENTIONS. Verificar valores del plan contra el repo antes de implementar.
- **Tests TDD descubren problemas de tipos**: `ScoringInput` con campos requeridos no compilaba con tests de input parcial — los tests forzaron hacerlos opcionales (mejor diseno).

---

## Notas rapidas

- Agrega aca cualquier cosa que aprendas durante el desarrollo
- Usa `[[wikilinks]]` para conectar con otras notas
