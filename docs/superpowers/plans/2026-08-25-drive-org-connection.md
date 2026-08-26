# Drive Organization Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar Drive desde tokens por usuario a una conexión cifrada por organización y entregar un navegador read-only que abra archivos en Google Drive.

**Architecture:** Una organización contiene tres miembros con el mismo rol operativo y una conexión Google Drive activa. El refresh token se cifra y se guarda únicamente en `drive_connection_secrets`; cada API route resuelve membership, selecciona una conexión del mismo `org_id` y usa su `root_folder_id` para containment. La UI solo lista metadata y abre `webViewLink`; los endpoints CRUD legacy no se exponen en la primera entrega.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase/Postgres RLS, Vitest, Zod, `googleapis`, Node `crypto`, Tailwind/shadcn.

**Spec:** `docs/superpowers/specs/2026-08-25-drive-org-connection-design.md`

## Global Constraints

- Una sola organización para las tres personas.
- `org_members.role` controla permisos; no usar `members.role`.
- Los agentes no hacen push, deploy, cambios productivos ni aplican migraciones en producción.
- Toda tabla nueva tiene `org_id`, RLS, policy tenant e índices por organización.
- Todo cambio de RLS, identidad org, OAuth o token requiere `security-reviewer`.
- `drive_refresh_token` no aparece en respuestas frontend ni en `/api/settings`.
- No se copian automáticamente refresh tokens legacy; la reconexión será un paso del owner.
- La primera UI es read-only y abre `webViewLink`; no se agrega CRUD nuevo.
- No se modifica una migración ya aplicada; la migración nueva usa el siguiente número libre `057`.
- No se committean secretos ni se muestran claves en chat.

## File Map

- Create `supabase/migrations/057_drive_connections.sql`: metadata, secretos separados, constraints, índices, RLS y policies.
- Create `src/lib/drive/crypto.ts`: cifrado AES-256-GCM server-only.
- Create `src/lib/drive/crypto.test.ts`: regresiones de cifrado y configuración.
- Create `src/lib/drive/connection-secrets.ts`: lectura server-only del secreto tras autorización explícita.
- Modify `src/lib/drive/client.ts`: cargar conexión org-scoped y crear cliente desde token cifrado.
- Modify `src/lib/drive/index.ts`, `src/lib/drive/types.ts`: exportar conexión y metadata pública.
- Modify `src/app/api/drive/auth/route.ts`: iniciar OAuth para la conexión de la organización.
- Modify `src/app/api/drive/auth/callback/route.ts`: guardar conexión cifrada y root asociado.
- Create/modify `src/app/api/drive/connections/route.ts`: metadata de conexiones sin tokens.
- Modify `src/app/api/drive/list/route.ts`: usar `connectionId` scoped y devolver metadata/link.
- Modify `src/app/api/settings/route.ts`: excluir `drive_refresh_token` de GET y respuestas.
- Modify `src/components/drive/drive-browser.tsx`: selector/estado de conexión y navegación read-only.
- Modify `src/components/drive/drive-file-list.tsx`: priorizar abrir en Google Drive y quitar acciones CRUD de la UI.
- Modify `src/app/(dashboard)/drive/page.tsx`: conexión/desconexión por API, no mutación directa desde browser.
- Modify `src/components/drive/drive-toolbar.tsx`, `drive-backup.tsx` si el render actual deja acciones de escritura visibles.
- Modify `src/lib/drive/*.test.ts`, `src/app/api/drive/**/*.test.ts`: regresiones de org, conexión, OAuth y links.
- Modify `DATABASE.md`, `ARCHITECTURE.md`, `API.md`, `.env.example`, `GLOSARIO.md`: documentación sin secretos.

### Task 1: Baseline y contrato de migración

**Agent:** `general` read-only.

**Files:** read only: spec, plan, current Drive routes/helpers/UI, `DATABASE.md`, migrations 024/055/056, settings route/tests.

**Interfaces:**
- Consumes: current uncommitted Drive worktree.
- Produces: inventory of conflicting files, current test baseline, and a migration-risk report.

- [ ] Run `git status --short`, `git diff --stat` and the focused Drive suite.
- [ ] Confirm migration number `057` is free and inspect RLS patterns in migrations 024, 038, 055 and 056.
- [ ] Confirm every UI write action that must be removed from the first read-only surface.
- [ ] Write `.superpowers/sdd/2026-08-25-drive-org-connection/task-1-report.md` with exact evidence.

Run:

```bash
npm run test:run -- src/lib/drive src/validations/drive.test.ts src/app/api/drive
npm run typecheck
```

### Task 2: Database migration and encrypted token contract

**Agent:** `general` implementation; requires later `security-reviewer`.

**Files:**
- Create `supabase/migrations/057_drive_connections.sql`.
- Create `src/lib/drive/crypto.ts`.
- Create `src/lib/drive/crypto.test.ts`.
- Modify `DATABASE.md` only after migration definition is stable.

**Interfaces:**
- Produces `encryptDriveToken(token: string): string` and `decryptDriveToken(payload: string): string`.
- Produces `drive_connections` metadata with `org_id`, `root_folder_id`, status and RLS; `drive_connection_secrets` stores only `org_id`, `connection_id`, encrypted token and timestamps with deny-by-default RLS.

- [ ] Write tests for round-trip encryption, invalid key, malformed payload, tampering and plaintext absence from encrypted payload.
- [ ] Run the crypto tests before implementation and confirm the missing helper/key failures.
- [ ] Implement AES-256-GCM using a 32-byte base64 key from `DRIVE_TOKEN_ENCRYPTION_KEY`; reject absent/invalid configuration.
- [ ] Add migration 057 with metadata `org_id`, root, status check, timestamps, trigger, `(org_id,status)` index and globally unique `root_folder_id`; add secret `org_id`, `connection_id`, encrypted token and deny policy.
- [ ] Add SELECT policy for active org members on metadata and mutation policies for owner/admin.
- [ ] Add `org_id` and `(org_id, connection_id)` index to `drive_connection_secrets`; enable RLS with an explicit deny policy for `authenticated`, granting access only through the server-side helper after explicit membership and connection checks.
- [ ] Run crypto tests and inspect migration with `git diff --check`.

### Task 3: Org-scoped Drive connection service

**Agent:** `general` implementation.

**Files:** `src/lib/drive/client.ts`, `src/lib/drive/index.ts`, `src/lib/drive/types.ts`, new/updated client tests.

**Interfaces:**
- `getDriveConnection(supabase, orgId, connectionId?): Promise<DriveConnectionMetadata | null>`.
- `getDriveClientForConnection(supabase, userId, orgId, connectionId?): Promise<drive_v3.Drive>`.
- `DriveConnectionMetadata` excludes all secret fields.

- [ ] Write failing tests for selecting default active connection by org, rejecting another org's connection, rejecting revoked status, and never returning encrypted token in metadata.
- [ ] Replace runtime dependence on `user_settings.drive_refresh_token` with metadata lookup and `connection-secrets.ts`.
- [ ] In `connection-secrets.ts`, verify active membership through the user-scoped Supabase client, verify the metadata row belongs to `orgId`, then read only that connection's secret with `createServiceRoleClient()`.
- [ ] Make `root_folder_id` come from the selected connection; remove runtime fallback to global shared root for new flow.
- [ ] Preserve folder containment against the connection root.
- [ ] Keep legacy helpers only where existing CRUD tests require them, but mark them non-primary and prevent cross-org shared-root use.
- [ ] Run all Drive library tests.

### Task 4: OAuth callback and connection API

**Agent:** `general` implementation.

**Files:** `src/app/api/drive/auth/route.ts`, `src/app/api/drive/auth/callback/route.ts`, `src/app/api/drive/connections/route.ts`, `src/lib/drive/connection-secrets.ts`, OAuth/connection tests.

**Interfaces:**
- `GET /api/drive/auth` resolves active org before redirect.
- Callback inserts/updates one active `drive_connections` metadata row and its paired `drive_connection_secrets` row using the encrypted token and configured root.
- `GET /api/drive/connections` returns only id, label, account email, root metadata and status.

- [ ] Add RED tests for unauthenticated, no-org, allowlist rejection, missing encryption key, duplicate root and successful encrypted persistence.
- [ ] Keep state comparison before token exchange and auth/org checks before token exchange.
- [ ] Read the bootstrap root from `GOOGLE_DRIVE_ROOT_FOLDER_IDS` only at connection setup; runtime list uses the database root.
- [ ] Never return token, OAuth credentials or provider exception details.
- [ ] Add revoke/disconnect behavior that marks the connection revoked and does not mutate `user_settings` from client code.
- [ ] Run callback and connections suites.

Documentation ownership for this task: update `API.md` for the connection/list response and OAuth behavior, and update `ARCHITECTURE.md` for org-scoped connection and server-only secret access.

### Task 5: Read-only list API and tenant tests

**Agent:** `general` implementation; then `security-reviewer`.

**Files:** `src/app/api/drive/list/route.ts`, connection/list tests, `folder-guard` tests.

**Interfaces:**
- `GET /api/drive/list?connectionId=<id>&folderId=<id>&pageToken=<token>`.
- Default connection is selected only from the authenticated org.
- Response contains `{ connection, files, nextPageToken }`, with public connection metadata and `webViewLink` only.

- [ ] Add RED tests for connection ID from another org, foreign folder under another root, revoked connection, viewer read access, and link metadata.
- [ ] Resolve authenticated user, active org and selected connection before calling Google.
- [ ] Validate requested folder under `connection.root_folder_id`.
- [ ] Ensure malformed/foreign IDs return controlled 400/403 without Google mutation.
- [ ] Run route tests and add a two-org cross-tenant reproduction that must fail closed.

### Task 6: Remove token exposure and migrate UI connection flow

**Agent:** `general` implementation.

**Files:** `src/app/api/settings/route.ts`, settings tests, `src/app/(dashboard)/drive/page.tsx`.

**Interfaces:**
- Settings GET returns user preferences but never `drive_refresh_token`.
- Drive page connects/disconnects via API, not direct browser Supabase update.

- [ ] Add a failing settings test asserting no token field in GET response, including first-settings creation response.
- [ ] Select an explicit allowlisted settings column set instead of `*`.
- [ ] Remove direct client-side update of `user_settings.drive_refresh_token`.
- [ ] Replace disconnect with connection revoke endpoint and refresh UI state.
- [ ] Run settings and Drive page tests/typecheck.

Documentation ownership for this task: update `.env.example` only with the variable names and non-secret descriptions; never add values.

### Task 7: Read-only Drive UI

**Agent:** `general` implementation.

**Files:** `drive-browser.tsx`, `drive-file-list.tsx`, `drive-toolbar.tsx`, `drive-backup.tsx`, Drive types and i18n.

**Interfaces:**
- `DriveBrowser` loads a connection list and passes selected `connectionId` to list calls.
- `DriveFileList` exposes folder navigation and `openInDrive(file)` only for files with `webViewLink`.

- [ ] Add/adjust component tests for loading metadata, selecting connection, navigating folders and opening external link with safe target attributes.
- [ ] Remove visible upload/new-folder/edit/delete/rename/download controls from the first surface.
- [ ] Keep folder navigation and pagination.
- [ ] Show connection label/status and clear empty/error states.
- [ ] Do not synthesize links; only use Google-provided `webViewLink`.
- [ ] Run typecheck, focused UI tests and build.

Documentation ownership for this task: update `GLOSARIO.md` to replace the per-user Drive token description with the organization connection description.

### Task 8: Full verification and review gates

**Agents:** `reviewer`, `security-reviewer`, then `general` verifier.

- [ ] Review migration 057 for RLS, indexes, uniqueness and rollback/legacy implications.
- [ ] Review service-role use, OAuth, encrypted token handling, org/connection selection and cross-tenant IDs.
- [ ] Run:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

- [ ] Confirm no secrets in diff and no production calls.
- [ ] Stop before applying migration or configuring Vercel until owner completes external checklist.

## Owner External Checkpoint

The agents will provide exact steps only after Task 8 is green:

1. Create/select Shared Drive.
2. Add the three Google accounts with equal permissions.
3. Create the project root folder.
4. Set `GOOGLE_DRIVE_ROOT_FOLDER_IDS`, `GOOGLE_OAUTH_REDIRECT_URI` and `DRIVE_TOKEN_ENCRYPTION_KEY` directly in the secret manager; never paste them in chat.
5. Apply migrations 057 and 058 in Supabase SQL Editor, in order.
6. Authorize the stable project Google account once.
7. Confirm list and links from all three application sessions.
8. Remove/rotate legacy OAuth secret only after successful E2E.

No agent applies migration 057 or changes production configuration.
