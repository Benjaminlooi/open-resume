# Companion → Backend Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all occurrences of "companion" (the internal name for the local backend service) to "backend" across the entire codebase — package names, directories, modules, env vars, UI copy, tests, docs, and plans.

**Architecture:** The local Fastify daemon at `127.0.0.1:47321` is currently called "companion" everywhere. This is an internal architecture leak — the term describes a relationship ("it accompanies the web app") rather than an identity ("it IS the backend"). Renaming to `backend` makes the codebase self-documenting and eliminates user-facing jargon.

**Tech Stack:** pnpm workspaces, TypeScript, Fastify, TanStack Router, Biome, Vitest.

**Rename Mapping:**

| Layer | Old | New |
|---|---|---|
| Package | `@open-resume/backend` | `@open-resume/backend` |
| Package | `@open-resume/contracts` | (unchanged) |
| Directory | `apps/backend/` | `apps/backend/` |
| DB folder | `.open-resume-backend/` | `.open-resume-backend/` |
| Module | `local-backend-client.ts` | `local-backend-client.ts` |
| Env prefix | `OPEN_RESUME_BACKEND_*` | `OPEN_RESUME_BACKEND_*` |
| Env var (port) | `OPEN_RESUME_BACKEND_PORT` | `OPEN_RESUME_BACKEND_PORT` |
| Env var (host) | `OPEN_RESUME_BACKEND_HOST` | `OPEN_RESUME_BACKEND_HOST` |
| Schema | `backendErrorResponseSchema` | `backendErrorResponseSchema` |
| Type | `BackendErrorResponse` | `BackendErrorResponse` |
| OpenAPI schema id | `BackendErrorResponse` | `BackendErrorResponse` |
| OpenAPI title | `Open Resume Companion API` | `Open Resume Backend API` |
| OpenAPI description | `Local backend service for extracting...` | `Local backend service for extracting...` |
| Health summary | `Check companion health` | `Check backend health` |
| Health service value | `open-resume-backend` | `open-resume-backend` |
| Health tag desc | `Operational backend endpoints` | `Operational backend endpoints` |
| Error log msg | `invalid companion request` | `invalid backend request` |
| Error response | `Invalid companion request` | `Invalid backend request` |
| Log message | `Open Resume companion listening` | `Open Resume backend listening` |
| Log message | `Open Resume companion failed to start` | `Open Resume backend failed to start` |
| UI subtitle | `companion crawler queue` | (dropped, just `crawler queue`) |
| UI error | `local backend is running` | `backend service is running` |
| UI error title | `Companion Backend Offline` | `Backend Offline` |
| UI error body | `Open Resume backend services are unreachable` | `Backend service is unreachable` |
| pnpm scripts | `companion:dev` | `backend:dev` |
| pnpm scripts | `companion:build` | `backend:build` |
| pnpm scripts | `companion:test` | `backend:test` |
| pnpm scripts | `companion:openapi` | `backend:openapi` |
| Docs folder files | `companion-*.md` in specs/plans | `backend-*.md` |

---

### Task 1: Rename contracts package schema symbols

**Files:**
- Modify: `packages/contracts/src/common.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Rename schema and type in `common.ts`**

In `packages/contracts/src/common.ts`, change:
```typescript
export const backendErrorResponseSchema = z
	.object({
		error: z.string(),
		details: z.string().optional(),
	})
	.strict();

export type BackendErrorResponse = z.infer<
	typeof backendErrorResponseSchema
>;
```
To:
```typescript
export const backendErrorResponseSchema = z
	.object({
		error: z.string(),
		details: z.string().optional(),
	})
	.strict();

export type BackendErrorResponse = z.infer<
	typeof backendErrorResponseSchema
>;
```

- [ ] **Step 2: Update exports and registry in `index.ts`**

In `packages/contracts/src/index.ts`:
- Change import from `backendErrorResponseSchema` to `backendErrorResponseSchema`
- Change `z.globalRegistry.add(backendErrorResponseSchema, { id: "BackendErrorResponse" })` to `z.globalRegistry.add(backendErrorResponseSchema, { id: "BackendErrorResponse" })`

- [ ] **Step 3: Verify contracts package still typechecks**

Run: `pnpm --filter @open-resume/contracts typecheck` — expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/src/common.ts packages/contracts/src/index.ts
git commit -m "refactor(contracts): rename companionErrorResponse to backendErrorResponse"
```

---

### Task 2: Rename backend app directory and package

**Files:**
- Move: `apps/backend/` → `apps/backend/`
- Modify: `apps/backend/package.json`
- Modify: `package.json` (root scripts)
- Modify: `.gitignore`

- [ ] **Step 1: Move the directory with git history**

```bash
git mv apps/backend apps/backend
```

- [ ] **Step 2: Update root `package.json` scripts**

In root `package.json`, replace all `companion:` script keys/values with `backend:`:

| Old | New |
|---|---|
| `"companion:dev": "pnpm --filter @open-resume/backend dev"` | `"backend:dev": "pnpm --filter @open-resume/backend dev"` |
| `"companion:openapi": "pnpm --filter @open-resume/backend openapi"` | `"backend:openapi": "pnpm --filter @open-resume/backend openapi"` |
| `"companion:build": "pnpm --filter @open-resume/backend build"` | `"backend:build": "pnpm --filter @open-resume/backend build"` |
| `"companion:test": "pnpm --filter @open-resume/backend test"` | `"backend:test": "pnpm --filter @open-resume/backend test"` |

Also update filter references in `dev`, `build`, `test`, `typecheck`, `lint`, `format`, `check` scripts from `--filter @open-resume/backend` to `--filter @open-resume/backend`.

- [ ] **Step 3: Update `apps/backend/package.json`**

Change:
- `"name": "@open-resume/backend"` → `"name": "@open-resume/backend"`
- `"name": "open-resume-backend"` in log metadata → `"name": "open-resume-backend"` (in index.ts, handled in Task 4)
- Update script `dev` to reference new filter name
- Update script `openapi:lint` path if needed (unchanged, references `openapi.json`)

- [ ] **Step 4: Update `.gitignore`**

In `.gitignore`:
- Change `apps/backend/.env` → `apps/backend/.env`
- Change `apps/backend/.open-resume-backend/` → `apps/backend/.open-resume-backend/`

- [ ] **Step 5: Update workspace file if present**

In `open-resume-monorepo.code-workspace`, update any path referencing `apps/backend` to `apps/backend`.

- [ ] **Step 6: Verify workspace resolves**

Run: `pnpm install` — expected: workspace resolves, no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/ apps/backend/ package.json .gitignore open-resume-monorepo.code-workspace
git commit -m "refactor: rename apps/backend directory to apps/backend"
```

---

### Task 3: Rename client module and internal symbols in web app

**Files:**
- Move: `apps/web/src/lib/local-backend-client.ts` → `apps/web/src/lib/local-backend-client.ts`
- Move: `apps/web/src/lib/local-backend-client.test.ts` → `apps/web/src/lib/local-backend-client.test.ts`
- Modify: All files importing from `local-backend-client`
- Modify: `apps/web/src/lib/AGENTS.md`

- [ ] **Step 1: Move the client module and test with git history**

```bash
git mv apps/web/src/lib/local-backend-client.ts apps/web/src/lib/local-backend-client.ts
git mv apps/web/src/lib/local-backend-client.test.ts apps/web/src/lib/local-backend-client.test.ts
```

- [ ] **Step 2: Rename internal symbols in `local-backend-client.ts`**

In `apps/web/src/lib/local-backend-client.ts`:

| Old | New |
|---|---|
| `export const backendBaseUrl` | `export const backendBaseUrl` |
| `async function backendFetch(` | `async function backendFetch(` |
| `"Local backend is not reachable. Start it with pnpm backend:dev."` | `"Local backend is not reachable. Start it with pnpm backend:dev."` |
| `parseCompanionResponse` | `parseBackendResponse` |
| `"Local backend could not..."` (all 18 messages) | `"Backend could not..."` |

Update all `backendFetch(...)` calls to `backendFetch(...)` and all `parseCompanionResponse(...)` calls to `parseBackendResponse(...)`.

- [ ] **Step 3: Update test file references**

In `apps/web/src/lib/local-backend-client.test.ts`:
- Update import path from `./local-backend-client` to `./local-backend-client`
- Rename describe block from `"local backend client"` to `"local backend client"`
- Update all expectation strings (e.g., `"Local backend is not reachable"` → `"Local backend is not reachable"`)

- [ ] **Step 4: Update all web app files importing the client**

Files with `from "./local-backend-client"` or `from "#/lib/local-backend-client"` that need updates:

| File | What to change |
|---|---|
| `apps/web/src/lib/job-posting-slice.ts` | import path |
| `apps/web/src/lib/resume-index-store.test.ts` | import path, mock path, test descriptions |
| `apps/web/src/lib/resume-index-slice.ts` | import path |
| `apps/web/src/lib/root-store.ts` | import path |
| `apps/web/src/lib/resume-slice.ts` | import path |
| `apps/web/src/lib/use-resume-auto-save.ts` | import path |
| `apps/web/src/lib/use-resume-auto-save.test.tsx` | import path, mock path, test descriptions |
| `apps/web/src/lib/job-application-slice.ts` | import path, error message `"from backend"` → `"from backend"` |
| `apps/web/src/features/job-postings/job-posting-store.test.ts` | import path, mock path |
| `apps/web/src/features/job-postings/job-ai.ts` | `import { backendBaseUrl }` → `import { backendBaseUrl }`, update usage |
| `apps/web/src/features/job-postings/job-application-store.test.ts` | mock path |
| `apps/web/src/features/job-postings/components/JobPostingDetailsDialog.tsx` | `import { backendBaseUrl }` → `import { backendBaseUrl }`, update usage in img src |
| `apps/web/src/features/job-postings/components/NewJobApplicationModal.tsx` | import path |
| `apps/web/src/features/job-postings/components/NewJobApplicationModal.test.tsx` | import path, mock path, test descriptions |
| `apps/web/src/features/job-postings/components/JobPostingCard.tsx` | import path (type-only, path changes) |
| `apps/web/src/components/editor/InteractiveAIPromptModal.tsx` | `import { backendBaseUrl }` → `import { backendBaseUrl }`, update fetch URL |
| `apps/web/src/components/dashboard/ResumeCard.tsx` | import path |
| `apps/web/src/routes/_app/profile.tsx` | import path (schema + types) |

- [ ] **Step 5: Update `apps/web/src/lib/AGENTS.md`**

Change references in the "WHERE TO LOOK" and other sections from `local-backend-client.ts` / `backend API` to `local-backend-client.ts` / `backend API`.

- [ ] **Step 6: Update `apps/web/src/features/job-postings/AGENTS.md` if present**

Run: `grep -r "companion" apps/web/src/features/job-postings/AGENTS.md` and update if found.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/
git commit -m "refactor(web): rename local-backend-client to local-backend-client"
```

---

### Task 4: Rename backend app internals (Fastify daemon)

**Files:**
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/config.ts` (env vars)
- Modify: `apps/backend/src/schema.test.ts`
- Modify: `apps/backend/src/server.test.ts` (test fixtures, test descriptions)
- Modify: `apps/backend/src/config.test.ts` (path assertions)
- Modify: `apps/backend/src/routes/system-routes.ts`
- Modify: `apps/backend/src/routes/job-routes.ts` (schema refs)
- Modify: `apps/backend/src/routes/profile-routes.ts` (schema refs)
- Modify: `apps/backend/src/routes/job-application-routes.ts` (schema refs)
- Modify: `apps/backend/src/routes/resume-routes.ts` (schema refs)
- Modify: `apps/backend/src/plugins/openapi.ts`
- Modify: `apps/backend/src/plugins/error-handler.ts`
- Modify: `apps/backend/src/extract/playwright.test.ts`
- Modify: `apps/backend/src/AGENTS.md`

- [ ] **Step 1: Update `index.ts` log messages**

In `apps/backend/src/index.ts`:
- `"Open Resume companion listening"` → `"Open Resume backend listening"`
- `"Open Resume companion failed to start"` → `"Open Resume backend failed to start"`

Also update env var references:
- `OPEN_RESUME_BACKEND_PORT` → `OPEN_RESUME_BACKEND_PORT`
- `OPEN_RESUME_BACKEND_HOST` → `OPEN_RESUME_BACKEND_HOST`

- [ ] **Step 2: Update `config.ts` env var schema and defaults**

In `apps/backend/src/config.ts`:

| Old | New |
|---|---|
| `OPEN_RESUME_BACKEND_DB_PATH` | `OPEN_RESUME_BACKEND_DB_PATH` |
| `OPEN_RESUME_BACKEND_LOG_LEVEL` | `OPEN_RESUME_BACKEND_LOG_LEVEL` |
| `OPEN_RESUME_BACKEND_LOG_SCRAPED_DATA` | `OPEN_RESUME_BACKEND_LOG_SCRAPED_DATA` |
| `OPEN_RESUME_BACKEND_HEADLESS` | `OPEN_RESUME_BACKEND_HEADLESS` |
| `OPEN_RESUME_BACKEND_AI_PROVIDER` | `OPEN_RESUME_BACKEND_AI_PROVIDER` |
| `.open-resume-backend/jobs.sqlite` (default DB path) | `.open-resume-backend/jobs.sqlite` |

Also update any comments referencing "companion" in this file.

- [ ] **Step 3: Update `system-routes.ts`**

In `apps/backend/src/routes/system-routes.ts`:
- Operation summary: `"Check companion health"` → `"Check backend health"`
- Response value: `service: "open-resume-backend"` → `service: "open-resume-backend"`

- [ ] **Step 4: Update `error-handler.ts`**

In `apps/backend/src/plugins/error-handler.ts`:
- Log message: `"invalid companion request"` → `"invalid backend request"`
- Response body: `error: "Invalid companion request"` → `error: "Invalid backend request"`

- [ ] **Step 5: Update `openapi.ts`**

In `apps/backend/src/plugins/openapi.ts`:
- `title: "Open Resume Companion API"` → `title: "Open Resume Backend API"`
- Description: `"Local backend service for extracting job details from pasted job URLs."` → `"Local backend service for extracting job details from pasted job URLs."`
- Tag: `description: "Operational backend endpoints."` → `description: "Operational backend endpoints."`

- [ ] **Step 6: Update all route files referencing schema**

In `apps/backend/src/routes/job-routes.ts`, `profile-routes.ts`, `job-application-routes.ts`, `resume-routes.ts`:
- Replace all `backendErrorResponseSchema` with `backendErrorResponseSchema`

- [ ] **Step 7: Update `schema.test.ts`**

In `apps/backend/src/schema.test.ts`:
- `describe("companion schema"` → `describe("backend schema"`
- `service: "companion"` → `service: "backend"` (3 occurrences in health response tests)
- `"rejects backend jobs with empty IDs"` → `"rejects backend jobs with empty IDs"`

- [ ] **Step 8: Update `server.test.ts`**

In `apps/backend/src/server.test.ts`:
- `describe("backend server"` → `describe("backend server"`
- `.open-resume-backend/test-db-` → `.open-resume-backend/test-db-` (and similar for profile, resume paths)
- `service: "open-resume-backend"` → `service: "open-resume-backend"` (in health assertion)
- `"Invalid companion request"` → `"Invalid companion request"` → `"Invalid backend request"` (in error message assertions)
- Update all `it("...")` descriptions containing "companion" to use "backend"

- [ ] **Step 9: Update `config.test.ts`**

In `apps/backend/src/config.test.ts`, update path assertions:
- `.open-resume-backend/jobs.sqlite` → `.open-resume-backend/jobs.sqlite`
- `.open-resume-backend/profile.json` → `.open-resume-backend/profile.json`
- `.open-resume-backend/resume.json` → `.open-resume-backend/resume.json`
- `.open-resume-backend/screenshots` → `.open-resume-backend/screenshots`

- [ ] **Step 10: Update `extract/playwright.test.ts`**

Update path containing `.open-resume-backend` to `.open-resume-backend`.

- [ ] **Step 11: Update AGENTS.md**

In `apps/backend/src/AGENTS.md`:
- Title: `# Companion Backend` → `# Backend` or `# Open Resume Backend`
- Update all internal references

- [ ] **Step 12: Update `.env.example`**

In `apps/backend/.env.example`:
- `OPEN_RESUME_BACKEND_LOG_LEVEL=info` → `OPEN_RESUME_BACKEND_LOG_LEVEL=info`
- `OPEN_RESUME_BACKEND_LOG_SCRAPED_DATA=0` → `OPEN_RESUME_BACKEND_LOG_SCRAPED_DATA=0`

- [ ] **Step 13: Commit**

```bash
git add apps/backend/
git commit -m "refactor(backend): rename companion to backend throughout Fastify daemon"
```

---

### Task 5: Update UI copy (user-facing strings)

**Files:**
- Modify: `apps/web/src/routes/_app/jobs/index.tsx`
- Modify: `apps/web/src/routes/_app/profile.tsx`

- [ ] **Step 1: Fix jobs page subtitle**

In `apps/web/src/routes/_app/jobs/index.tsx:114`:
```tsx
// Before:
Manage your job applications pipeline and companion crawler queue.
// After:
Manage your job applications pipeline and crawler queue.
```

- [ ] **Step 2: Fix profile page error messages**

In `apps/web/src/routes/_app/profile.tsx`:

| Line | Old | New |
|---|---|---|
| 370 | `"Failed to save candidate profile. Make sure the local backend is running."` | `"Failed to save candidate profile. Make sure the backend service is running."` |
| 380 | `"Companion Backend Offline"` | `"Backend Offline"` |
| 383 | `"Open Resume backend services are unreachable at"` | `"Backend service is unreachable at"` |
| 388 | `pnpm backend:dev` | `pnpm backend:dev` |

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/
git commit -m "fix(ui): replace companion jargon with backend in user-facing copy"
```

---

### Task 6: Update project docs and AGENTS.md files

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md` (root)
- Modify: `apps/web/src/lib/AGENTS.md`
- Modify: `apps/web/src/features/job-postings/AGENTS.md`
- Move: `docs/superpowers/specs/*companion*` → rename to `*backend*`
- Move: `docs/superpowers/plans/*companion*` → rename to `*backend*`

- [ ] **Step 1: Update root `README.md`**

Search and replace all occurrences of "companion" with appropriate "backend" terminology. Update:
- Section headings referencing "Companion Backend"
- `pnpm backend:dev` commands → `pnpm backend:dev`
- Env var references
- Any architectural prose describing the backend

- [ ] **Step 2: Update root `AGENTS.md`**

Update:
- Structure diagram: `companion/` → `backend/`
- Conventions section
- Any cross-references to companion package

- [ ] **Step 3: Rename doc files with git history**

Rename spec and plan files that contain "companion" in their filename:

Specs to rename:
```bash
git mv docs/superpowers/specs/2026-06-12-companion-fastify-route-plugins-design.md docs/superpowers/specs/2026-06-12-backend-fastify-route-plugins-design.md
git mv docs/superpowers/specs/2026-06-13-companion-server-options-validation-design.md docs/superpowers/specs/2026-06-13-backend-server-options-validation-design.md
git mv docs/superpowers/specs/2026-06-15-companion-job-store-refactoring-design.md docs/superpowers/specs/2026-06-15-backend-job-store-refactoring-design.md
git mv docs/superpowers/specs/2026-06-11-backend-owned-job-capture-design.md docs/superpowers/specs/2026-06-11-backend-owned-job-capture-design.md
```

Plans to rename:
```bash
git mv docs/superpowers/plans/2026-06-12-companion-fastify-route-plugins.md docs/superpowers/plans/2026-06-12-backend-fastify-route-plugins.md
git mv docs/superpowers/plans/2026-06-13-companion-server-options-validation.md docs/superpowers/plans/2026-06-13-backend-server-options-validation.md
git mv docs/superpowers/plans/2026-06-15-companion-job-store-refactoring.md docs/superpowers/plans/2026-06-15-backend-job-store-refactoring.md
git mv docs/superpowers/plans/2026-06-11-backend-owned-job-capture-plan.md docs/superpowers/plans/2026-06-11-backend-owned-job-capture-plan.md
git mv docs/superpowers/plans/2026-06-10-local-companion-backend-bootstrap.md docs/superpowers/plans/2026-06-10-local-backend-bootstrap.md
```

- [ ] **Step 4: Update content inside doc/plans files**

In each renamed file, update prose/headings referencing "companion" to use "backend" (search within each file for residual mentions and replace).

- [ ] **Step 5: Commit**

```bash
git add docs/ AGENTS.md README.md
git commit -m "refactor(docs): rename companion references to backend across docs"
```

---

### Task 7: Final verification

- [ ] **Step 1: Verify no stray "companion" references remain**

Run: `grep -ri "companion" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.jsonc" .`

Expected: ZERO results in source files (excluding `pnpm-lock.yaml` and any `node_modules` — grep should exclude those via the targeted include list).

Also check specifically:
- UI strings: `grep -r "companion" apps/web/src/routes/`
- Env vars: `grep -r "COMPANION" apps/backend/`
- Imports: `grep -r "local-companion" apps/`
- Import: `grep -r "backendErrorResponseSchema" apps/ packages/`

All must be clean.

- [ ] **Step 2: Typecheck all packages**

Run: `pnpm typecheck` — expected: exit 0.

- [ ] **Step 3: Run tests**

Run: `pnpm test` — expected: all tests pass.

- [ ] **Step 4: Run lint**

Run: `pnpm lint` — expected: exit 0.

- [ ] **Step 5: Run format check**

Run: `pnpm format` — expected: clean (no formatting changes needed).

- [ ] **Step 6: Build**

Run: `pnpm build` — expected: exit 0.

---

### Task 8: Optional cleanup — OpenAPI JSON artifact

- [ ] **Step 1: Regenerate OpenAPI artifact**

Run: `pnpm backend:openapi` (since the script is now renamed).

This rewrites `apps/backend/openapi.json` with the new `title: "Open Resume Backend API"` and updated schema id `BackendErrorResponse`.

- [ ] **Step 2: Lint the OpenAPI spec**

Run: `pnpm --filter @open-resume/backend openapi:lint` — expected: valid.

- [ ] **Step 3: Commit the regenerated artifact**

```bash
git add apps/backend/openapi.json
git commit -m "chore(backend): regenerate OpenAPI spec with renamed backend references"
```

---

## Summary of changes by file count

| Category | Approx. Files |
|---|---|
| Contracts (schema rename) | 2 |
| Root config (package.json, gitignore) | 3 |
| Backend app internals | 15 |
| Web app lib (client rename) | 8 |
| Web app slices/stores | 6 |
| Web app components/dialogs | 4 |
| Web app routes (UI copy) | 2 |
| Features (job-postings) | 4 |
| Tests | 10+ |
| Docs (plans + specs) | 12 renamed + content updates |
| AGENTS.md files | 4 |
| README.md | 1 |
| **Total** | **~70+ files touched** |

## Risk areas

1. **DB folder rename** — existing users on this branch will have `.open-resume-backend/` on disk; the app will create `.open-resume-backend/` fresh. Data loss for existing SQLite state, but acceptable since the user said backwards compatibility is not a concern.
2. **pnpm workspace resolution** — renaming the package filter `@open-resume/backend` → `@open-resume/backend` requires `pnpm install` to be re-run so the lockfile and node_modules symlinks are correct.
3. **Test fixture paths** — `server.test.ts` uses `.open-resume-backend/` paths as temp directory prefix; these are just directory names for test isolation, no product impact.
