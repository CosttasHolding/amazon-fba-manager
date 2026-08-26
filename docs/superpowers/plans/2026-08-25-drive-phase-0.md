# Drive Phase 0 Implementation Plan

> **Superseded:** este plan describe el flujo legacy por usuario y root global. La fuente de verdad actual es `2026-08-25-drive-org-connection.md` junto con `2026-08-25-drive-security-remediation.md`; no ejecutar este plan literalmente.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar y verificar localmente el endurecimiento OAuth/tenant y el CRUD de Google Drive antes de cualquier prueba o acción productiva.

**Architecture:** Mantener el flujo actual de OAuth por usuario mediante `getDriveClient()`, resolver la organización con `getOrgId()`, y limitar cada operación a la raíz Drive autorizada por `getDriveRootFolderId()` y `folder-guard`. Las rutas validan inputs antes de crear el cliente externo y devuelven errores controlados; las pruebas mockean Supabase, roles, Drive y containment.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Vitest, Zod, `googleapis`, Supabase SSR.

**Spec:** `docs/superpowers/specs/2026-08-25-qa-roadmap-agent-orchestration-design.md`

## Global Constraints

- Los agentes solo pueden editar código/documentación local y ejecutar verificaciones locales.
- No hacer push, deploy, cambios en Supabase/Vercel/Google Cloud ni mutaciones productivas.
- No revertir cambios existentes del worktree.
- Todo cambio API, server-side, auth, OAuth o tenant-scoped requiere `security-reviewer`.
- Todo cambio importante requiere `reviewer` independiente.
- TypeScript strict sin `any`; usar Zod para inputs externos.
- El scope tenant debe conservar auth, organización activa, membership/rol, `org_id` indirecto y containment Drive.
- No incluir archivos ajenos a Drive salvo documentación estrictamente necesaria para esta fase.

## File Map

- `src/lib/drive/client.ts`: cliente OAuth por usuario y resolución de raíz por organización.
- `src/lib/drive/folder-guard.ts`: containment de carpetas/archivos bajo la raíz autorizada.
- `src/lib/drive/download.ts`: `Content-Disposition` seguro para descargas.
- `src/validations/drive.ts`: schemas Zod para nombres y contenido de archivos.
- `src/app/api/drive/auth/**`: inicio y callback OAuth.
- `src/app/api/drive/backup/route.ts`: backup de datos en Drive.
- `src/app/api/drive/folders/route.ts`: creación de carpetas.
- `src/app/api/drive/list/route.ts`: listado y paginación.
- `src/app/api/drive/upload/route.ts`: upload multipart con límite de tamaño.
- `src/app/api/drive/download/[id]/route.ts`: descarga autorizada.
- `src/app/api/drive/rename/[id]/route.ts`: rename autorizado.
- `src/app/api/drive/update/[id]/route.ts`: actualización de contenido de texto.
- `src/app/api/drive/delete/[id]/route.ts`: borrado de archivos, no carpetas.
- `src/lib/drive/*.test.ts`, `src/validations/drive.test.ts`: regresiones unitarias.
- `src/app/api/drive/**/*.test.ts`: regresiones de rutas.
- `scripts/qa-battery.js`, `docs/QA_LOG.md`, `API.md`, `ARCHITECTURE.md`, `README.md`, `.env.example`, `Bugs Conocidos.md`, `docs/TESTING_STRATEGY.md`: documentación y batería QA ya modificadas en el diff actual; revisar coherencia, no reescribir sin necesidad.

### Task 1: Establish Drive baseline

**Agent:** `general` read-only.

**Files:**
- Read: `git status`, `git diff`, `src/app/api/drive/**`, `src/lib/drive/**`, `src/validations/drive*`.
- Modify: none.
- Test: existing Drive unit and route suites.

**Interfaces:**
- Consumes: current uncommitted Drive diff.
- Produces: a written handoff with changed files, test baseline, failures, and files that must remain untouched.

- [ ] **Step 1: Record the worktree boundary**

Run:

```bash
git status --short
git diff --stat
git diff --name-only
```

Expected: the existing Drive-related modified and untracked files are listed; no files are changed.

- [ ] **Step 2: Run the targeted baseline**

Run:

```bash
npm run test:run -- src/lib/drive src/validations/drive.test.ts src/app/api/drive
```

Expected: capture the exact pass/fail count. If a test fails, record the first failing test and stack trace without changing code.

- [ ] **Step 3: Deliver the handoff**

Include the exact test command, result, changed-file boundary, and suspected contract gap. Do not propose a production action as a local fix.

### Task 2: Complete regression coverage before changing behavior

**Agent:** `general` implementation.

**Files:**
- Modify: `src/app/api/drive/routes.test.ts`.
- Modify: `src/app/api/drive/backup/route.test.ts` only for Drive-specific missing cases.
- Modify: `src/app/api/drive/auth/route.test.ts` and `src/app/api/drive/auth/callback/route.test.ts` only for uncovered OAuth fail-closed cases.
- Modify: `src/lib/drive/client.test.ts`.
- Modify: `src/lib/drive/download.test.ts`.
- Modify: `src/validations/drive.test.ts`.
- Modify: implementation files only in Task 3 after a failing regression is established.

**Interfaces:**
- Consumes: Task 1 baseline and current route contracts.
- Produces: deterministic tests for auth, tenant resolution, role gates, root containment, validation, CRUD success, and safe download headers.

- [ ] **Step 1: Add route denial tests**

Cover these exact cases in `routes.test.ts` using the existing mocks:

```ts
it("devuelve 401 sin usuario", async () => {
  mocks.createClient.mockResolvedValueOnce({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  });

  const response = await list(createMockRequest("http://localhost/api/drive/list"));

  expect(response.status).toBe(401);
  expect(mocks.getDriveClient).not.toHaveBeenCalled();
});

it("devuelve 400 sin organización activa", async () => {
  mocks.getOrgId.mockResolvedValueOnce(null);

  const response = await list(createMockRequest("http://localhost/api/drive/list"));

  expect(response.status).toBe(400);
  expect(mocks.getDriveClient).not.toHaveBeenCalled();
});

it("devuelve 403 para viewer al crear carpeta", async () => {
  mocks.hasOrgRole.mockResolvedValueOnce(false);

  const response = await folders(createMockRequest("http://localhost/api/drive/folders", {
    method: "POST",
    body: JSON.stringify({ name: "Reports" }),
  }));

  expect(response.status).toBe(403);
  expect(mocks.getDriveClient).not.toHaveBeenCalled();
});

it("devuelve 403 al renombrar un archivo fuera de la raíz", async () => {
  mocks.assertFileWithinRoot.mockRejectedValueOnce(new mocks.FolderOutsideRootError());

  const response = await rename(
    createMockRequest("http://localhost/api/drive/rename/file-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "renamed.txt" }),
    }),
    { params: { id: "file-1" } },
  );

  expect(response.status).toBe(403);
});
```

Repetir el mismo patrón para upload, update y delete con `hasOrgRole=false`, y para download, update y delete con `assertFileWithinRoot` rechazando. Cada test debe verificar el status y que `drive.files.*` no se ejecute.

- [ ] **Step 2: Add success-path CRUD tests**

Extend `routes.test.ts` with exact assertions for:

```ts
it("sube un archivo dentro de la raíz autorizada", async () => {
  const drive = makeDrive();
  mocks.getDriveClient.mockResolvedValueOnce(drive);
  const form = new FormData();
  form.append("file", new Blob(["report"], { type: "text/plain" }), "report.txt");

  const response = await upload({ formData: () => Promise.resolve(form) } as never);

  expect(response.status).toBe(200);
  expect(drive.files.create).toHaveBeenCalledWith(expect.objectContaining({
    requestBody: expect.objectContaining({ name: "report.txt", parents: ["root"] }),
  }));
});

it("crea una carpeta dentro de la raíz autorizada", async () => {
  const drive = makeDrive();
  mocks.getDriveClient.mockResolvedValueOnce(drive);

  const response = await folders(createMockRequest("http://localhost/api/drive/folders", {
    method: "POST",
    body: JSON.stringify({ name: "Reports", parentId: "root" }),
  }));

  expect(response.status).toBe(200);
  expect(drive.files.create).toHaveBeenCalledWith(expect.objectContaining({
    requestBody: expect.objectContaining({
      name: "Reports",
      mimeType: "application/vnd.google-apps.folder",
      parents: ["root"],
    }),
  }));
});

it("renombra, actualiza y elimina un archivo autorizado", async () => {
  const drive = makeDrive();
  mocks.getDriveClient.mockResolvedValue(drive);

  const renameResponse = await rename(
    createMockRequest("http://localhost/api/drive/rename/file-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "renamed.txt" }),
    }),
    { params: { id: "file-1" } },
  );
  const updateResponse = await update(
    createMockRequest("http://localhost/api/drive/update/file-1", {
      method: "PUT",
      body: JSON.stringify({ content: "updated" }),
    }),
    { params: { id: "file-1" } },
  );
  const deleteResponse = await remove(
    createMockRequest("http://localhost/api/drive/delete/file-1", { method: "DELETE" }),
    { params: { id: "file-1" } },
  );

  expect(renameResponse.status).toBe(200);
  expect(updateResponse.status).toBe(200);
  expect(deleteResponse.status).toBe(200);
  expect(drive.files.update).toHaveBeenCalledTimes(2);
  expect(drive.files.delete).toHaveBeenCalledWith({ fileId: "file-1" });
});
```

The tests must assert that `assertFolderWithinRoot`/`assertFileWithinRoot` receive the resolved root and that no caller-supplied foreign parent is passed to Drive.

- [ ] **Step 3: Add OAuth and helper regressions**

Add tests for these exact contracts:

- missing OAuth client id/secret fails before Supabase token lookup;
- missing user or refresh token fails closed;
- OAuth callback rejects missing/invalid state and does not persist a token;
- `buildContentDisposition('a"b\n.txt')` emits no raw quote or newline in the fallback filename and preserves the encoded filename parameter;
- `getOrgRootFolderId` escapes backslashes and apostrophes in the Drive query;
- `driveNameSchema` rejects control characters and `driveContentSchema` rejects content over `1_000_000` characters.

- [ ] **Step 4: Run the new tests and record failures**

Run:

```bash
npm run test:run -- src/lib/drive src/validations/drive.test.ts src/app/api/drive
```

Expected: new tests fail only where the current implementation violates a stated contract. Do not weaken assertions to make existing behavior pass.

### Task 3: Implement the minimum fixes required by failing regressions

**Agent:** `general` implementation.

**Files:** only files identified by a failing test in Task 2, principally:
- `src/app/api/drive/auth/route.ts`.
- `src/app/api/drive/auth/callback/route.ts`.
- `src/app/api/drive/backup/route.ts`.
- `src/app/api/drive/folders/route.ts`.
- `src/app/api/drive/list/route.ts`.
- `src/app/api/drive/upload/route.ts`.
- `src/app/api/drive/download/[id]/route.ts`.
- `src/app/api/drive/rename/[id]/route.ts`.
- `src/app/api/drive/update/[id]/route.ts`.
- `src/app/api/drive/delete/[id]/route.ts`.
- `src/lib/drive/client.ts`.
- `src/lib/drive/download.ts`.
- `src/validations/drive.ts`.

**Interfaces:**
- Consumes: failing tests from Task 2.
- Produces: the smallest behavior change that makes those tests pass while preserving auth, role and folder containment order.

- [ ] **Step 1: Fix one failing contract at a time**

For each failure, change the implementation only after identifying the route/helper contract. Preserve this order in routes: authenticate user, resolve active organization, enforce mutation role, parse/validate external input, create Drive client, resolve authorized root, assert containment, then call Drive.

- [ ] **Step 2: Keep error boundaries controlled**

Malformed JSON and invalid Zod input must return `400`; unauthenticated requests `401`; missing permissions or outside-root access `403`; unexpected provider/database errors may remain `500` without exposing secrets or tokens.

- [ ] **Step 3: Run the focused suite after each fix**

Run:

```bash
npm run test:run -- src/lib/drive src/validations/drive.test.ts src/app/api/drive
```

Expected: all Drive-focused tests pass and no unrelated test is changed to accommodate the fix.

### Task 4: Tenant-security review

**Agent:** `security-reviewer`, read-only.

**Files:** all Drive routes, `src/lib/drive/client.ts`, `src/lib/drive/folder-guard.ts`, `src/lib/drive/oauth.ts`, auth callback tests, and the focused test suite.

**Interfaces:**
- Consumes: Task 3 diff and test evidence.
- Produces: findings ordered by severity, explicit tenant checklist, and an approval/block decision.

- [ ] **Step 1: Verify the tenant checklist**

Confirm explicitly: authenticated user, active organization, membership, mutation role, organization-derived Drive root, caller folder/file containment, no service-role bypass, no user-selected refresh-token selector, OAuth state/redirect validation, and no cross-tenant identifier acceptance.

- [ ] **Step 2: Verify negative paths**

Confirm tests cover anonymous access, no org, viewer mutation, foreign folder/file, invalid input, invalid OAuth state, and missing OAuth configuration.

- [ ] **Step 3: Issue the review result**

Return `APPROVED` only with no unresolved High/Critical finding. Any finding must name the file, line/route, exploit scenario, and the smallest corrective test/change.

### Task 5: Independent code review and local verification

**Agent:** `reviewer` first, then `general` as verifier.

**Files:** all files in the current Drive diff; no unrelated files.

**Interfaces:**
- Consumes: Task 3 diff, Task 4 security result, and test output.
- Produces: review result and fresh local verification evidence.

- [ ] **Step 1: Review the diff for regressions**

Run:

```bash
git diff --check
git diff -- src/app/api/drive src/lib/drive src/validations/drive.ts
```

Inspect for scope expansion, secret exposure, permissive mocks, missing test assertions, and changes that bypass existing `getOrgId`, `hasOrgRole`, or `folder-guard` patterns.

- [ ] **Step 2: Run the focused suite**

Run:

```bash
npm run test:run -- src/lib/drive src/validations/drive.test.ts src/app/api/drive
```

Expected: all focused Drive tests pass.

- [ ] **Step 3: Run project checks**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: typecheck exits 0; lint has no new errors, with any pre-existing warnings recorded exactly.

- [ ] **Step 4: Confirm the phase gate**

The phase is complete only if focused tests pass, typecheck passes, lint has no new errors, `security-reviewer` says `APPROVED`, `reviewer` reports no unresolved High/Critical finding, and no production action was performed.

## Execution Notes

- Do not commit or push as part of this plan unless the owner explicitly requests it.
- Preserve unrelated worktree modifications and report them if they prevent a clean phase gate.
- After Task 5, stop and present the evidence before beginning Phase 1 production verification.
