# OpenAPI Linting and Contract Validation Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom no-dependency validator script `validate-openapi.ts` with Redocly CLI for OpenAPI linting and Vitest for custom contract assertions.

**Architecture:** Use `@redocly/cli` configured with standard recommended rules to validate schema structure and reference correctness. Port the custom endpoint/schema validation checks into a dedicated Vitest test file `apps/companion/test/openapi.test.ts`.

**Tech Stack:** `@redocly/cli`, `vitest`, `pnpm`

---

### Task 1: Add Redocly Dependency and Update Npm Scripts

**Files:**
- Modify: `apps/companion/package.json`

- [ ] **Step 1: Update package.json to include `@redocly/cli` and update the `openapi:lint` script**
  Modify `apps/companion/package.json` to add `"@redocly/cli": "^2.31.6"` to `devDependencies` and update the `openapi:lint` script to run `redocly lint openapi.json`.

  ```json
  // In apps/companion/package.json:
  "scripts": {
    ...
    "openapi:lint": "redocly lint openapi.json",
    ...
  },
  "devDependencies": {
    ...
    "@redocly/cli": "^2.31.6",
    ...
  }
  ```

- [ ] **Step 2: Run pnpm install in the workspace root to download the package and update lockfile**
  Run: `pnpm install` in `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper`
  Expected: Command finishes successfully and updates `pnpm-lock.yaml`.

- [ ] **Step 3: Run the modified lint script to ensure redocly runs (and fails or warns due to lack of config)**
  Run: `pnpm --filter @open-resume/companion openapi:lint` in `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper`
  Expected: Command runs `@redocly/cli` but might output warnings or run with default rules.

- [ ] **Step 4: Commit the dependencies changes**
  Run:
  ```bash
  git add apps/companion/package.json pnpm-lock.yaml
  git commit -m "chore: add @redocly/cli dependency and update lint script"
  ```

---

### Task 2: Configure Redocly Linting

**Files:**
- Create: `apps/companion/redocly.yaml`

- [ ] **Step 1: Create `redocly.yaml` configuration file extending recommended rules**
  Create `apps/companion/redocly.yaml`:
  ```yaml
  extends:
    - recommended
  ```

- [ ] **Step 2: Run the lint script to verify successful execution**
  Run: `pnpm --filter @open-resume/companion openapi:lint` in `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper`
  Expected: Linting runs successfully with no errors (or only minor recommended warnings).

- [ ] **Step 3: Commit the config file**
  Run:
  ```bash
  git add apps/companion/redocly.yaml
  git commit -m "chore: configure redocly with recommended rules"
  ```

---

### Task 3: Implement Contract Tests in Vitest

**Files:**
- Create: `apps/companion/test/openapi.test.ts`

- [ ] **Step 1: Create a test file with a failing assertion to verify TDD setup**
  Create `apps/companion/test/openapi.test.ts` containing:
  ```typescript
  import { readFileSync } from "node:fs";
  import { resolve } from "node:path";
  import { describe, it, expect } from "vitest";

  const specPath = resolve(__dirname, "../openapi.json");
  const spec = JSON.parse(readFileSync(specPath, "utf8"));

  describe("OpenAPI Contract Validation", () => {
    it("should fail temporarily to verify test execution", () => {
      expect(spec.components?.schemas?.["NonExistentSchema"]).toBeDefined();
    });
  });
  ```

- [ ] **Step 2: Run tests to verify the test fails**
  Run: `pnpm --filter @open-resume/companion test` in `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper`
  Expected: FAIL with "expected undefined to be defined".

- [ ] **Step 3: Replace with the actual contract assertions**
  Update `apps/companion/test/openapi.test.ts` with the complete validation assertions ported from the old script:
  ```typescript
  import { readFileSync } from "node:fs";
  import { resolve } from "node:path";
  import { describe, it, expect } from "vitest";

  const specPath = resolve(__dirname, "../openapi.json");
  const spec = JSON.parse(readFileSync(specPath, "utf8"));

  const requiredSchemas = [
    "HealthResponse",
    "ExtractJobRequest",
    "JobExtractionResult",
    "CompanionErrorResponse",
  ] as const;

  const requiredOperations = [
    {
      path: "/health",
      method: "get",
      operationId: "getHealth",
      tags: ["System"],
      responses: ["200"],
    },
    {
      path: "/extract-job",
      method: "post",
      operationId: "extractJob",
      tags: ["Extraction"],
      responses: ["200", "400", "500", "502"],
    },
  ] as const;

  describe("OpenAPI Contract Validation", () => {
    it("should match OpenAPI version 3.0.3", () => {
      expect(spec.openapi).toBe("3.0.3");
    });

    it("should have required info fields", () => {
      expect(spec.info?.title).toBeDefined();
      expect(spec.info?.version).toBeDefined();
    });

    it.each(requiredSchemas)("should define schema %s", (schemaName) => {
      expect(spec.components?.schemas?.[schemaName]).toBeDefined();
    });

    describe("Operations Validation", () => {
      requiredOperations.forEach((op) => {
        it(`should define ${op.method.toUpperCase()} ${op.path} correctly`, () => {
          const pathItem = spec.paths?.[op.path];
          expect(pathItem).toBeDefined();

          const method = pathItem[op.method];
          expect(method).toBeDefined();
          expect(method.operationId).toBe(op.operationId);

          op.tags.forEach((tag) => {
            expect(method.tags).toContain(tag);
          });

          op.responses.forEach((statusCode) => {
            expect(method.responses?.[statusCode]).toBeDefined();
          });
        });
      });
    });

    it("should hide internal /openapi.json route", () => {
      expect(spec.paths?.["/openapi.json"]).toBeUndefined();
    });
  });
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run: `pnpm --filter @open-resume/companion test` in `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper`
  Expected: PASS

- [ ] **Step 5: Commit the contract tests**
  Run:
  ```bash
  git add apps/companion/test/openapi.test.ts
  git commit -m "test: add OpenAPI contract validation tests using Vitest"
  ```

---

### Task 4: Clean Up Custom Validator Script

**Files:**
- Delete: `apps/companion/src/validate-openapi.ts`

- [ ] **Step 1: Delete the old custom validation script**
  Run: `rm apps/companion/src/validate-openapi.ts` in `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper`
  Expected: File is deleted.

- [ ] **Step 2: Run all workspace verifications to ensure clean build and passing tests**
  Run: `pnpm verify` in `/Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper`
  Expected: Typecheck, test, and build all PASS.

- [ ] **Step 3: Commit the cleanup**
  Run:
  ```bash
  git add apps/companion/src/validate-openapi.ts
  git commit -m "chore: remove custom validate-openapi.ts validator script"
  ```
