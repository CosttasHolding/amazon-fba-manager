---
tipo: personal
tags: [learning, aprendizaje]
ultima_actualizacion: 2026-08-21
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

## Windows / PowerShell 5.1 (2026-08-21)

- **`Out-File` sin encoding explícito corrompe no-ASCII**: al generar review packages (`git diff ... | Out-File pkg.diff`), PS 5.1 usa la codepage del sistema → acentos y árabe (i18n JSONs) salen como mojibake y los revisores subagentes ven texto corrupto. Fix: siempre `-Encoding utf8` en cada `Out-File` (incluidos los `-Append`).

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

## Verificar columnas de Supabase con PostgREST (2026-08-04)

- **`@supabase/supabase-js` NO puede consultar `information_schema`**: el cliente REST cachea el schema de tablas de negocio y tira "Could not find the table 'public.information_schema' in the schema cache". Para chequear si una columna existe, hacer un `select=<columna>` directo a `/rest/v1/<tabla>?select=<col>&limit=1` con el header `apikey`/`Authorization` — si la columna no existe, PostgREST devuelve 400 `42703 column ... does not exist`; si existe, 200.
- **Probar el CHECK constraint de una columna**: insertar una fila de prueba con el valor boundary usando el service role key y borrarla al instante. Si el insert falla con `23514` (check violation) la migracion no esta; si entra, esta. (Ojo: hay que usar un `user_id` que exista en `profiles` o el FK `23503` enmascara el resultado.)
- **Orden code-vs-db**: al agregar columnas, aplicar la migracion en prod ANTES o a la par del deploy del codigo que las usa — si el codigo se despliega primero, las queries contra la columna nueva rompen en prod (bug detectado con la migracion 033).

## Orquestador con subagentes en paralelo (2026-08-04)

- **Yo como cerebro orquestador**: hacer primero la base compartida (type + schema + tests) y despachar en paralelo subagentes sobre archivos disjuntos (route, capture, modal, card, i18n), luego yo reviso el diff y corro la verificacion final completa (tsc/lint/test/build). Cada subagente verifica lo suyo (tsc + su test + lint) antes de reportar.
- **Los subagentes mienten menos con briefs cerrados**: dar firma exacta de lo que van a consumir (p. ej. campos del tipo que ya existen) evita que inventen o rompan interfaces.

## Vercel / Next.js estaticos vs middleware (2026-08-01)

- **`public/` se sirve sin auth**: `/LOGO.png` responde 200 anonimo aunque el app exija login. Los estaticos de `public/` se sirven directo desde el CDN.
- **PERO el middleware corre antes que los estaticos SI el matcher incluye el path**: un archivo `public/extension.zip` con matcher `.*` (que NO excluye `.zip`) da 307 a /login para peticiones anonimas. Un usuario logueado lo recibe igual (pasa el middleware con `NextResponse.next()`).
- **Shadowing por segmento de ruta**: un zip en `public/research/extension.zip` bajo una ruta de app `(dashboard)/research` es fragil — y si el deploy es VIEJO (anterior al commit que agrego el archivo), Vercel no lo tiene y la descarga devuelve la pagina HTML como "zip". Fix: archivos de descarga en la raiz de `public/` (`/extension.zip`), sin colision con segmentos de ruta.
- **`git show HEAD:file > file` en PowerShell corrompe binario** (convierte a texto). Usar `cmd /c "git show HEAD:file > out"` o `git cat-file`.

## Subagent-Driven Development (2026-07-31)

- **Review final whole-branch vale oro**: encontro 4 criticos que los reviews por tarea no vieron (dominio inventado en el plan, endpoint publico, zip untracked, host_permissions).
- **El plan puede tener errores**: el dominio `fba-manager.vercel.app` del plan era inventado; el real estaba en README/CONVENTIONS. Verificar valores del plan contra el repo antes de implementar.
- **Tests TDD descubren problemas de tipos**: `ScoringInput` con campos requeridos no compilaba con tests de input parcial — los tests forzaron hacerlos opcionales (mejor diseno).

## i18n / Intl (2026-08-03)

- **El brief con datos de test puede estar mal**: `Intl.NumberFormat("en-US", {notation:"compact"})` redondea `91992` → `"92K"` (ICU rounding), NO `"91.9K"` como esperaba el plan. Un implementer con TDD honesto corrigio el input de test a `91900` y documento el desvio. Verificar valores numericos de fixtures con el runtime real.
- **`t()` de este codebase exige `Locale`** (`"es"|"en"|"ar"`), no `string` — tipar los parametros de helpers que pasan a `t()` con `Locale`.
- **`Intl.NumberFormat` por badge es caro**: en lists renderizadas, un solo `fmtCompact` hoisted por locale es mejor que recrear el formatter por item.

## Scoring en capture (2026-08-03)

- **Score como snapshot de captura**: si el score se calcula solo en el capture route, cualquier edicion manual posterior (PUT) lo deja stale. Si se persiste una columna derivada, o se recalcula en cada mutacion o se documenta como snapshot — nunca dejar el drift silencioso.
- **Gate `hasData` vs score 0**: distinguir "sin datos → null" de "datos presentes pero score bajo → 0" evita que un producto sin informacion aparezca con score 0 (indistinguible de un producto malo de verdad).

## Observaciones SDD (2026-08-03)

- **3 desvios del brief que eran correcciones**: ICU rounding en fixture, `Locale` en vez de `string`, guard `!= null` (no `!== null`) para campos opcionales. Un brief no es dogma: si el implementer documenta el por que y el reviewer lo verifica contra el runtime, es el flujo trabajando.
- **El "7 tests" del plan no coincidia con el snippet (5 `it`)**: los numeros de test del plan son estimaciones; el reporte honesto del implementer manda.

---

## Notas rapidas

- Agrega aca cualquier cosa que aprendas durante el desarrollo
- Usa `[[wikilinks]]` para conectar con otras notas
