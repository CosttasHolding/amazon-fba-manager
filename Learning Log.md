---
tipo: personal
tags: [learning, aprendizaje]
ultima_actualizacion: 2026-07-22
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

---

## Notas rapidas

- Agrega aca cualquier cosa que aprendas durante el desarrollo
- Usa `[[wikilinks]]` para conectar con otras notas
