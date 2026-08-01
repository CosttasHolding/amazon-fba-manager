---
tipo: personal
tags: [learning, aprendizaje]
ultima_actualizacion: 2026-08-01
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

## Zod (2026-08-01)

- **`.catch()` por campo para respuestas de LLM**: `z.enum([...]).catch("fallback")` y `z.array(...).catch([])` permiten que un solo campo invalido de GPT no tire todo el parseo. Mejor que `.parse()` estricto para respuestas no deterministas.

## Testing / TypeScript (2026-08-01)

- **Mocks de NextRequest en tests**: `createMockRequest` debe tener return type `NextRequest` con cast interno (`as unknown as NextRequest`) — asi los route handlers typecheckean sin tocar los 40 call sites. Arreglo centralizado de errores de tipo.
- **`ReturnType<typeof fn>` auto-referencial rompe inferencia**: `return x as ReturnType<typeof buildQueryChain>` crea referencia circular → TS7023. Solucion: anotar el return type de la funcion directamente.
- **Cast `Error` a `Record<string, unknown>` falla**: las clases de Error no se solapan lo suficiente. Usar `as unknown as Record<...>`.

## Build cross-platform (2026-08-01)

- **`adm-zip` reemplaza PowerShell Compress-Archive**: `new AdmZip().addLocalFolder(dist).writeZip(path)` es cross-platform. `zip.addLocalFolder` incluye los directorios raiz (`content/`, `popup/`), igual que Compress-Archive.
- **Scripts que usan `npx` sin declarar la dep son bug latente**: `tsx`/`esbuild` se usaban en `npm run build:extension` sin estar en devDependencies — un `npm ci` fresco los rompe. Declarar siempre.

## Verificacion contra prod (2026-08-01)

- **Probar schema real con probe insert/delete**: insertar un registro marcado (`TEST_PROBE_DELETE_ME`) con el payload exacto del endpoint y borrarlo de inmediato valida compatibilidad de schema sin credenciales de usuario. El service role key permite SELECT/INSERT/DELETE via PostgREST.
- **El vault puede estar desactualizado**: `App State.md` decia "migration pendiente" pero ya estaba aplicada en prod — verificar contra el sistema real antes de asumir.

## Subagent-Driven Development (2026-07-31)

- **Review final whole-branch vale oro**: encontro 4 criticos que los reviews por tarea no vieron (dominio inventado en el plan, endpoint publico, zip untracked, host_permissions).
- **El plan puede tener errores**: el dominio `fba-manager.vercel.app` del plan era inventado; el real estaba en README/CONVENTIONS. Verificar valores del plan contra el repo antes de implementar.
- **Tests TDD descubren problemas de tipos**: `ScoringInput` con campos requeridos no compilaba con tests de input parcial — los tests forzaron hacerlos opcionales (mejor diseno).

---

## Notas rapidas

- Agrega aca cualquier cosa que aprendas durante el desarrollo
- Usa `[[wikilinks]]` para conectar con otras notas
