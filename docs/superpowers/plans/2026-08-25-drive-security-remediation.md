# Drive Security Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate global/root mutation and OAuth binding risks, migrate Drive operations to org-scoped connections, and prove tenant isolation before production setup.

**Architecture:** Each organization receives an explicitly configured Drive root from a server-only org-to-root mapping. OAuth state is single-use and persisted with `user_id`, `org_id` and root snapshot. Database defense-in-depth prevents authenticated clients from changing roots; only the server-side service-role RPC can write connection roots after actor authorization. All Drive routes, including legacy mutations and backup, obtain the active org connection and encrypted connection token.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase/PostgreSQL RLS, `googleapis`, Vitest, optional staging integration tests.

**Spec:** `docs/superpowers/specs/2026-08-25-drive-org-connection-design.md`

## Global Constraints

- Every server-side Drive operation resolves `user_id` and `org_id` from authenticated membership; client org headers are only selectors validated against membership.
- Service-role reads/writes must perform authorization in application code and, for RPCs, again inside SQL using the actor UUID.
- No refresh token is selected from or written to `user_settings` by supported Drive code.
- No request may use `GOOGLE_DRIVE_FOLDER_ID` or fallback to a global root.
- No migration is applied to production in this work; create forward-only migration files and record manual owner actions.
- No upload/edit/rename/delete/download proxy/backup is exposed by the read-only UI.
- Use regression tests with expected tenant IDs and root IDs for every changed boundary.

---

### Task 1: Harden connection schema and server-only OAuth state

**Files:**
- Create: `supabase/migrations/058_harden_drive_tenant_boundaries.sql`
- Modify: `DATABASE.md`
- Create: `src/lib/drive/org-root-config.ts`
- Create: `src/lib/drive/oauth-state.ts`
- Test: `src/lib/drive/org-root-config.test.ts`, `src/lib/drive/oauth-state.test.ts`

**Interfaces:**
- `getDriveRootFolderIdForOrg(orgId: string): string | null` reads only `GOOGLE_DRIVE_ROOT_FOLDER_IDS` as a JSON object mapping organization UUIDs to root IDs and rejects malformed/non-UUID entries.
- `createDriveOAuthState(input: { state: string; userId: string; orgId: string; rootFolderId: string }): Promise<void>` stores only a SHA-256 state hash server-side.
- `consumeDriveOAuthState(state: string): Promise<{ userId: string; orgId: string; rootFolderId: string } | null>` atomically consumes an unexpired state.

- [ ] **Step 1: Write failing migration contract tests/static assertions** for the immutable root trigger, authenticated deny policy on the state table, actor authorization in both SECURITY DEFINER RPCs, and absence of the old global-root write path.
- [ ] **Step 2: Run the focused tests and confirm they fail** because the new migration/config/state helpers do not exist.
- [ ] **Step 3: Add migration 058** with `drive_oauth_states(state_hash primary key, user_id, org_id, root_folder_id, expires_at, created_at)`, composite org foreign keys where applicable, RLS enabled, explicit deny for `authenticated`, and service-role-only access.
- [ ] **Step 4: Add a `BEFORE UPDATE` trigger** that raises when `root_folder_id` changes for a non-`service_role` request. Keep normal metadata updates possible under the existing admin policy.
- [ ] **Step 5: Recreate the upsert/revoke RPCs with actor checks** against active `org_members` and owner/admin roles; grant execution only to `service_role`; drop the old signatures so an unaudited RPC cannot remain callable.
- [ ] **Step 6: Implement root mapping and single-use state helpers** using `createServiceRoleClient`, SHA-256 hashing, expiry filtering and delete/select consumption. Never log state, root mapping or token values.
- [ ] **Step 7: Run focused tests, `npm run typecheck` and `git diff --check`.**

### Task 2: Bind OAuth to organization and remove global root

**Files:**
- Modify: `src/app/api/drive/auth/route.ts`
- Modify: `src/app/api/drive/auth/callback/route.ts`
- Modify: `src/lib/drive/oauth.ts`
- Modify: `src/lib/drive/connection-secrets.ts`
- Test: `src/app/api/drive/auth/routes.test.ts`, `src/lib/drive/oauth-state.test.ts`

**Interfaces:**
- OAuth start resolves `rootFolderId = getDriveRootFolderIdForOrg(orgId)` and persists state `{userId, orgId, rootFolderId}` before redirect.
- Callback verifies cookie state, authenticated user, current membership/org and consumed state identity before exchanging the code.

- [ ] **Step 1: Add RED tests** for missing per-org root, state user/org mismatch, replayed/expired state, changed org context, and callback success using the stored org root.
- [ ] **Step 2: Replace `GOOGLE_DRIVE_FOLDER_ID` checks** in start/callback with `getDriveRootFolderIdForOrg`; never accept root IDs from callback query/body.
- [ ] **Step 3: Persist state before redirect** and consume it once in the callback; delete the cookie on every terminal path.
- [ ] **Step 4: Require `GOOGLE_OAUTH_REDIRECT_URI`** through `getDriveRedirectUri`; reject missing configuration instead of deriving a request origin.
- [ ] **Step 5: Pass the stored root to `upsertDriveConnectionForOrg`** only after state/org/user checks and encrypted token validation.
- [ ] **Step 6: Update RPC client calls** for actor-authenticated signatures and add tests that a mismatched actor cannot save/revoke another org’s connection.
- [ ] **Step 7: Run OAuth and connection tests, typecheck and diff check.**

### Task 3: Make folder containment graph-safe

**Files:**
- Modify: `src/lib/drive/folder-guard.ts`
- Test: `src/lib/drive/folder-guard.test.ts`, `src/app/api/drive/list/route.test.ts`

- [ ] **Step 1: Add RED tests** for a folder/file with multiple parents where only a non-first parent is within root, a cycle, depth overflow, trashed ancestor and root equality.
- [ ] **Step 2: Replace first-parent traversal with bounded DFS/BFS** over all parents, with a visited set keyed by file ID. Accept only when every reachable parent path required by the object reaches the selected root; reject cycles/overflow/trashed/outside branches.
- [ ] **Step 3: Apply the same graph rule to file parents** before list results are returned or legacy operations run.
- [ ] **Step 4: Run folder/list tests and diff check.**

### Task 4: Migrate legacy Drive routes off user settings and global roots

**Files:**
- Modify: `src/lib/drive/client.ts`
- Modify: `src/app/api/drive/upload/route.ts`
- Modify: `src/app/api/drive/folders/route.ts`
- Modify: `src/app/api/drive/download/[id]/route.ts`
- Modify: `src/app/api/drive/rename/[id]/route.ts`
- Modify: `src/app/api/drive/update/[id]/route.ts`
- Modify: `src/app/api/drive/delete/[id]/route.ts`
- Modify: `src/app/api/drive/backup/route.ts`
- Test: each route’s existing test plus `src/app/api/drive/legacy-tenant-isolation.test.ts`

**Interfaces:**
- Replace `getDriveClient()` with `getDriveClientForConnection(supabase, userId, orgId, connectionId?)` in every supported route.
- Use `connection.rootFolderId` for containment and require the selected/active connection to belong to resolved `orgId`.

- [ ] **Step 1: Add RED assertions** that each legacy route calls the connection-scoped client and never selects `user_settings.drive_refresh_token` or calls `getRootFolderId`.
- [ ] **Step 2: Update route auth setup** to resolve authenticated user and org membership before constructing a Drive client; preserve each route’s role policy.
- [ ] **Step 3: Update upload/folders/rename/update/delete/download** to use the connection root and graph-safe guard.
- [ ] **Step 4: Update backup** to use the active connection, connection root and encrypted connection secret; preserve database `org_id` filters.
- [ ] **Step 5: Remove the supported legacy client implementation** and leave no runtime reference to `user_settings.drive_refresh_token` outside explicitly quarantined migration/type compatibility code.
- [ ] **Step 6: Add two-org mock isolation tests** covering manipulated connection/file IDs and root IDs for read and mutation routes.
- [ ] **Step 7: Run all Drive route tests, typecheck and diff check.**

### Task 5: Real-tenant integration coverage and documentation

**Files:**
- Modify: `src/lib/drive/connection-rpc.integration.test.ts`
- Create: `src/app/api/drive/tenant-isolation.integration.test.ts`
- Modify: `.superpowers/sdd/2026-08-25-drive-org-connection/progress.md`
- Modify: `DATABASE.md` if migration 058 adds tables/functions

- [ ] **Step 1: Add opt-in staging tests** using two authenticated non-production users/orgs, not service-role-only assertions.
- [ ] **Step 2: Verify user A cannot select/update/revoke/list user B’s connection, cannot change root directly, and cannot pass user B’s folder/file IDs.**
- [ ] **Step 3: Verify OAuth state cannot be consumed by another user or org and cannot be replayed.**
- [ ] **Step 4: Keep tests skipped unless explicit staging env and opt-in guard are present; never read production credentials.**
- [ ] **Step 5: Update ledger with migration status and owner-only deployment actions.**

### Task 6: Independent security review and full verification

**Files:**
- Create: `.superpowers/sdd/2026-08-25-drive-org-connection/security-remediation-review-package.md`
- Create: `.superpowers/sdd/2026-08-25-drive-org-connection/security-remediation-report.md`

- [ ] **Step 1: Run `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` and `git diff --check` sequentially.**
- [ ] **Step 2: Dispatch a fresh `security-reviewer`** for RLS, RPC actor checks, OAuth binding, service-role reads, root mapping, legacy routes and cross-tenant leakage.
- [ ] **Step 3: Resolve every CRITICAL/HIGH finding and re-review; do not declare checkpoint readiness with unresolved tenant findings.**
- [ ] **Step 4: Record that migration 058 remains unapplied and list exact owner actions for staging/production.**
