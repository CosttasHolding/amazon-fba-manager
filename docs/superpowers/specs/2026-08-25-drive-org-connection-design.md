# Conexión Drive por organización y navegador read-only

**Fecha:** 2026-08-25
**Estado:** aprobado para implementación por el owner

## Objetivo

Permitir que tres personas trabajen sobre el mismo proyecto y vean el mismo Google Drive desde la aplicación, con una sola organización, una conexión Drive estable por organización y una UI que muestre metadata y abra los archivos mediante `webViewLink` sin replicar ni descargar contenido.

## Modelo de equipo

- Existe una sola organización del proyecto.
- Los tres usuarios son miembros de `org_members`.
- Los tres reciben el mismo poder operativo mediante el mismo rol mutante (`admin` como recomendación práctica).
- `organizations.owner_id` continúa siendo un owner técnico único; no se introduce co-ownership en esta feature.
- Los permisos de usuarios se determinan por `org_members.role`, nunca por `members.role`.

## Modelo Google recomendado

- El proyecto usa un Shared Drive común.
- Las tres cuentas Google tienen permisos equivalentes en Google.
- La aplicación usa una conexión estable asociada a la organización.
- El root de Drive pertenece a esa conexión y no se toma de un root global compartido entre varias organizaciones.
- La conexión puede evolucionar a múltiples conexiones por organización, pero la primera entrega solo necesita una conexión activa por organización.

## Modelo de datos

Se crean `drive_connections` y `drive_connection_secrets`.

`drive_connections` contiene solo metadata:

- `id UUID PRIMARY KEY`.
- `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
- `provider TEXT NOT NULL DEFAULT 'google_drive'`.
- `label TEXT NOT NULL`.
- `google_account_email TEXT NULL`.
- `root_folder_id TEXT NOT NULL`.
- `status TEXT NOT NULL DEFAULT 'active'` con valores `active`, `revoked`, `error`.
- `created_by UUID REFERENCES profiles(id)`.
- `created_at` y `updated_at`.
- índice por `(org_id, status)`.
- unicidad global de `root_folder_id` para impedir que dos organizaciones compartan accidentalmente el mismo namespace físico.

`drive_connection_secrets` contiene `connection_id UUID PRIMARY KEY REFERENCES drive_connections(id) ON DELETE CASCADE`, `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`, `refresh_token_encrypted TEXT NOT NULL`, `created_at` y `updated_at`.

`drive_connections` tiene RLS. Miembros activos pueden leer metadata de conexiones de su organización. Solo `owner`/`admin` pueden crear, actualizar, revocar o eliminar conexiones. `drive_connection_secrets` tiene RLS habilitada con una policy deny explícita para `authenticated`; solo un helper server-side puede leerla con service role después de verificar explícitamente usuario, membership, `org_id` y conexión. El refresh token nunca se devuelve a la UI.

## Tokens

- Los tokens nuevos se cifran server-side con AES-256-GCM y se guardan en `drive_connection_secrets`.
- La clave se obtiene de `DRIVE_TOKEN_ENCRYPTION_KEY`, exclusivamente server-side.
- La clave no se commitea, documenta ni pega en chat.
- `user_settings.drive_refresh_token` deja de participar en el flujo nuevo.
- No se copia automáticamente el token legacy: el owner deberá reconectar una cuenta estable una vez validada la nueva implementación.
- `/api/settings` debe dejar de seleccionar y devolver `drive_refresh_token`.

## OAuth

- El callback valida usuario, organización activa y allowlist antes de intercambiar el código.
- El callback cifra y persiste el refresh token únicamente en `drive_connection_secrets`; `drive_connections` recibe solo metadata.
- El `org_id` se obtiene de membership, nunca de un parámetro confiado.
- El state continúa siendo un nonce CSRF con cookie segura; el binding fuerte server-side de sesión/org queda fuera de esta primera entrega.
- La conexión inicial usa el root configurado para bootstrap, pero las operaciones posteriores leen `root_folder_id` de la fila de conexión.

## Superficie funcional v1

La UI de Drive será read-only:

- listar carpetas y archivos;
- mostrar nombre, tipo, tamaño, fechas y conexión;
- navegar subcarpetas bajo el root de la conexión;
- abrir `webViewLink` en nueva pestaña con `noopener noreferrer`.

La UI no muestra upload, crear carpeta, editar, renombrar, borrar, descarga proxy ni backup como parte de esta entrega. Los endpoints legacy de mutación no se eliminan automáticamente: permanecen fuera de la UI y siguen sujetos a auth, rol y containment hasta una decisión posterior de retiro.

## Aislamiento

- Cada request resuelve usuario y `org_id` mediante membership.
- `connectionId`, si se acepta, debe pertenecer al `org_id` resuelto.
- El root usado por `folder-guard` sale de la conexión seleccionada.
- Un ID de archivo o carpeta de otra conexión/organización recibe rechazo controlado.
- No se permite el fallback a un root global compartido para varias organizaciones.

## Verificación

- Tests de cifrado y descifrado sin exponer plaintext en respuestas.
- Tests de RLS/policies y selección de conexión por organización.
- Tests OAuth y persistencia encrypted.
- Tests de `/api/settings` sin token.
- Tests de list y `webViewLink`.
- Tests cross-tenant con dos organizaciones y roots distintos.
- Typecheck, lint, tests y build antes del checkpoint productivo.
- E2E manual con las tres cuentas después de configurar Google y Vercel.

## Fuera de alcance

- Tres organizaciones para tres personas.
- Co-owners reales.
- Indexación local del contenido.
- Sincronización offline.
- CRUD de Drive en la primera entrega.
- Migración automática de refresh tokens legacy.
