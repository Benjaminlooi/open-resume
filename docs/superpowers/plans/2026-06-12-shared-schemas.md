# Shared Schemas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Zod schemas and TypeScript types into a modular workspace package `@open-resume/contracts` to share them between the backend and frontend.

**Architecture:** We will configure a TypeScript-based npm workspace package under `packages/contracts/`. The package will publish raw TypeScript source code, allowing both frontend (`Vite`) and backend (`tsx`/`tsup`) to import and bundle them directly, providing zero compilation latency during local development.

**Tech Stack:** TypeScript, Node.js (ESM), Zod, pnpm workspaces.

---

### Task 1: Package Creation and Workspace Config

Create the new `@open-resume/contracts` package and register it in the pnpm workspace.

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`

- [ ] **Step 1: Update workspace configuration**
  Add `"packages/*"` to `pnpm-workspace.yaml` packages array.
  
  File: `pnpm-workspace.yaml`
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  
  allowBuilds:
    '@google/genai': true
    core-js: true
    esbuild: true
    protobufjs: true
    sharp: true
    workerd: true
  ```

- [ ] **Step 2: Create contracts package.json**
  Write package properties to configure `@open-resume/contracts` as a private ESM workspace package.
  
  File: `packages/contracts/package.json`
  ```json
  {
    "name": "@open-resume/contracts",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "exports": {
      ".": "./src/index.ts"
    },
    "peerDependencies": {
      "zod": "^4.4.3"
    }
  }
  ```

- [ ] **Step 3: Create tsconfig.json**
  Configure compiler options for the raw TypeScript package.
  
  File: `packages/contracts/tsconfig.json`
  ```json
  {
    "compilerOptions": {
      "target": "ESNext",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "declaration": true,
      "skipLibCheck": true
    },
    "include": ["src/**/*"]
  }
  ```

- [ ] **Step 4: Verify workspace link**
  Run: `pnpm install`
  Expected: Command finishes successfully and registers the new package.

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add pnpm-workspace.yaml packages/contracts/package.json packages/contracts/tsconfig.json
  git commit -m "feat(contracts): initialize contracts package structure"
  ```

---

### Task 2: Create Shared Modular Schemas

Create the split files inside the new package and migrate the Zod validation schemas and TypeScript types.

**Files:**
- Create: `packages/contracts/src/common.ts`
- Create: `packages/contracts/src/jobs.ts`
- Create: `packages/contracts/src/resumes.ts`
- Create: `packages/contracts/src/profiles.ts`
- Create: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write common schemas**
  File: `packages/contracts/src/common.ts`
  ```typescript
  import { z } from "zod";

  export const httpUrlSchema = z
    .string()
    .url()
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "URL must use http or https");

  export const backendErrorResponseSchema = z
    .object({
      error: z.string(),
      details: z.string().optional(),
    })
    .strict();

  export type BackendErrorResponse = z.infer<
    typeof backendErrorResponseSchema
  >;

  export const okResponseSchema = z
    .object({
      ok: z.boolean(),
    })
    .strict();

  export type OkResponse = z.infer<typeof okResponseSchema>;
  ```

- [ ] **Step 2: Write jobs schemas**
  File: `packages/contracts/src/jobs.ts`
  ```typescript
  import { z } from "zod";
  import { httpUrlSchema } from "./common.js";

  export const extractJobRequestSchema = z
    .object({
      url: httpUrlSchema.describe("HTTP or HTTPS job posting URL to extract."),
    })
    .strict();

  export type ExtractJobRequest = z.infer<typeof extractJobRequestSchema>;

  export const healthResponseSchema = z
    .object({
      ok: z.boolean(),
      service: z.string(),
    })
    .strict();

  export type HealthResponse = z.infer<typeof healthResponseSchema>;

  export const extractionMethodSchema = z.enum([
    "json-ld",
    "readability",
    "playwright",
  ]);

  export const jobExtractionResultSchema = z
    .object({
      sourceUrl: httpUrlSchema,
      title: z.string(),
      company: z.string(),
      location: z.string(),
      description: z.string(),
      rawText: z.string(),
      extractionMethod: extractionMethodSchema,
      extractedAt: z.number().describe("Unix timestamp in milliseconds."),
    })
    .strict();

  export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

  export const crawlStatusSchema = z.enum([
    "pending",
    "crawling",
    "analyzing",
    "ready",
    "failed",
  ]);

  export type CrawlStatus = z.infer<typeof crawlStatusSchema>;

  export const createJobRequestSchema = z
    .object({
      sourceUrl: httpUrlSchema.describe(
        "HTTP or HTTPS job posting URL to crawl.",
      ),
    })
    .strict();

  export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;

  export const jobIdParamsSchema = z
    .object({
      id: z.string().min(1),
    })
    .strict();

  export type JobIdParams = z.infer<typeof jobIdParamsSchema>;

  export const backendJobSchema = z
    .object({
      id: z.string().min(1),
      sourceUrl: httpUrlSchema,
      crawlStatus: crawlStatusSchema,
      crawlError: z.string().nullable(),
      cleanedText: z.string(),
      createdAt: z.number().describe("Unix timestamp in milliseconds."),
      updatedAt: z.number().describe("Unix timestamp in milliseconds."),
      crawledAt: z
        .number()
        .nullable()
        .describe(
          "Unix timestamp in milliseconds, or null before crawl success.",
        ),
      parsedTitle: z.string().nullable().optional(),
      parsedCompany: z.string().nullable().optional(),
      parsedLocation: z.string().nullable().optional(),
      parsedDescription: z.string().nullable().optional(),
      fitScore: z.number().nullable().optional(),
      fitBriefJson: z.string().nullable().optional(),
    })
    .strict();

  export type BackendJob = z.infer<typeof backendJobSchema>;

  export const backendJobsResponseSchema = z
    .object({
      jobs: z.array(backendJobSchema),
    })
    .strict();

  export type BackendJobsResponse = z.infer<typeof backendJobsResponseSchema>;

  export const deleteJobResponseSchema = z
    .object({
      deleted: z.boolean(),
    })
    .strict();

  export type DeleteJobResponse = z.infer<typeof deleteJobResponseSchema>;

  export const jobFitBriefSchema = z
    .object({
      roleSummary: z.string(),
      requirements: z.array(z.string()),
      keywords: z.array(z.string()),
      strengths: z.array(z.string()),
      gaps: z.array(z.string()),
      risks: z.array(z.string()),
      nextActions: z.array(z.string()),
      generatedAt: z.number(),
    })
    .strict();

  export type JobFitBrief = z.infer<typeof jobFitBriefSchema>;
  ```

- [ ] **Step 3: Write resumes schemas**
  File: `packages/contracts/src/resumes.ts`
  ```typescript
  import { z } from "zod";

  export const resumeContentSchema = z.record(z.string(), z.unknown());

  export type ResumeContent = z.infer<typeof resumeContentSchema>;

  export const resumeSummarySchema = z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
      templateId: z.string().min(1),
      lastModified: z.number().describe("Unix timestamp in milliseconds."),
      isDefault: z.boolean(),
    })
    .strict();

  export type ResumeSummary = z.infer<typeof resumeSummarySchema>;

  export const resumeDetailsSchema = resumeSummarySchema
    .extend({
      content: resumeContentSchema,
    })
    .strict();

  export type ResumeDetails = z.infer<typeof resumeDetailsSchema>;

  export const resumesResponseSchema = z
    .object({
      resumes: z.array(resumeSummarySchema),
    })
    .strict();

  export type ResumesResponse = z.infer<typeof resumesResponseSchema>;

  export const createResumeRequestSchema = z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
      templateId: z.string().min(1),
      content: resumeContentSchema,
    })
    .strict();

  export type CreateResumeRequest = z.infer<typeof createResumeRequestSchema>;

  export const updateResumeRequestSchema = z
    .object({
      name: z.string().min(1).optional(),
      templateId: z.string().min(1).optional(),
      content: resumeContentSchema.optional(),
    })
    .strict();

  export type UpdateResumeRequest = z.infer<typeof updateResumeRequestSchema>;

  export const resumeSyncRequestSchema = z
    .object({
      resume: z.record(z.string(), z.unknown()),
    })
    .strict();

  export type ResumeSyncRequest = z.infer<typeof resumeSyncRequestSchema>;

  export const syncedResumeResponseSchema = z.record(z.string(), z.unknown());
  ```

- [ ] **Step 4: Write profiles schemas**
  File: `packages/contracts/src/profiles.ts`
  ```typescript
  import { z } from "zod";

  export const targetRoleArchetypeSchema = z
    .object({
      name: z.string(),
      level: z.string(),
      fit: z.enum(["primary", "secondary", "adjacent"]),
    })
    .strict();

  export type TargetRoleArchetype = z.infer<typeof targetRoleArchetypeSchema>;

  export const candidateProfileSchema = z
    .object({
      candidate: z
        .object({
          fullName: z.string(),
          email: z.string(),
          phone: z.string(),
          location: z.string(),
          linkedin: z.string(),
          portfolioUrl: z.string(),
          github: z.string(),
          twitter: z.string().optional(),
        })
        .strict(),
      targetRoles: z
        .object({
          primary: z.array(z.string()),
          archetypes: z.array(targetRoleArchetypeSchema),
        })
        .strict(),
      narrative: z
        .object({
          headline: z.string(),
          exitStory: z.string(),
          superpowers: z.array(z.string()),
          proofPoints: z.array(
            z
              .object({
                name: z.string(),
                url: z.string(),
                heroMetric: z.string(),
              })
              .strict(),
          ),
        })
        .strict(),
      compensation: z
        .object({
          targetRange: z.string(),
          currency: z.string(),
          minimum: z.string(),
          preferred: z.string(),
          locationFlexibility: z.string(),
        })
        .strict(),
      location: z
        .object({
          country: z.string(),
          city: z.string(),
          timezone: z.string(),
          visaStatus: z.string(),
          onsiteAvailability: z.string(),
          remotePolicy: z.string(),
        })
        .strict(),
    })
    .strict();

  export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
  ```

- [ ] **Step 5: Write index.ts with OpenAPI global registries and exports**
  File: `packages/contracts/src/index.ts`
  ```typescript
  import { z } from "zod";
  import {
    backendErrorResponseSchema,
    healthResponseSchema,
    okResponseSchema,
  } from "./common.js";
  import {
    backendJobSchema,
    backendJobsResponseSchema,
    crawlStatusSchema,
    createJobRequestSchema,
    deleteJobResponseSchema,
    extractJobRequestSchema,
    jobExtractionResultSchema,
    jobFitBriefSchema,
    jobIdParamsSchema,
  } from "./jobs.js";
  import {
    createResumeRequestSchema,
    resumeContentSchema,
    resumeDetailsSchema,
    resumeSummarySchema,
    resumeSyncRequestSchema,
    resumesResponseSchema,
    updateResumeRequestSchema,
  } from "./resumes.js";
  import { candidateProfileSchema } from "./profiles.js";

  // Re-export modules
  export * from "./common.js";
  export * from "./jobs.js";
  export * from "./resumes.js";
  export * from "./profiles.js";

  // Register schemas globally for fastify-type-provider-zod swagger generators
  z.globalRegistry.add(healthResponseSchema, { id: "HealthResponse" });
  z.globalRegistry.add(extractJobRequestSchema, { id: "ExtractJobRequest" });
  z.globalRegistry.add(jobExtractionResultSchema, { id: "JobExtractionResult" });
  z.globalRegistry.add(backendErrorResponseSchema, {
    id: "BackendErrorResponse",
  });
  z.globalRegistry.add(crawlStatusSchema, { id: "CrawlStatus" });
  z.globalRegistry.add(createJobRequestSchema, { id: "CreateJobRequest" });
  z.globalRegistry.add(jobIdParamsSchema, { id: "JobIdParams" });
  z.globalRegistry.add(backendJobSchema, { id: "BackendJob" });
  z.globalRegistry.add(backendJobsResponseSchema, {
    id: "BackendJobsResponse",
  });
  z.globalRegistry.add(deleteJobResponseSchema, { id: "DeleteJobResponse" });
  z.globalRegistry.add(resumeContentSchema, { id: "ResumeContent" });
  z.globalRegistry.add(resumeSummarySchema, { id: "ResumeSummary" });
  z.globalRegistry.add(resumeDetailsSchema, { id: "ResumeDetails" });
  z.globalRegistry.add(resumesResponseSchema, { id: "ResumesResponse" });
  z.globalRegistry.add(createResumeRequestSchema, { id: "CreateResumeRequest" });
  z.globalRegistry.add(updateResumeRequestSchema, { id: "UpdateResumeRequest" });
  z.globalRegistry.add(candidateProfileSchema, { id: "CandidateProfile" });
  z.globalRegistry.add(resumeSyncRequestSchema, { id: "ResumeSyncRequest" });
  z.globalRegistry.add(okResponseSchema, { id: "OkResponse" });
  z.globalRegistry.add(jobFitBriefSchema, { id: "JobFitBrief" });
  ```

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add packages/contracts/src
  git commit -m "feat(contracts): migrate schemas into modular files"
  ```

---

### Task 3: Integrate Backend

Hook up the backend to use the contracts package.

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/src/schema.ts`

- [ ] **Step 1: Add workspace dependency to backend**
  Add `"@open-resume/contracts": "workspace:*"` to `dependencies` in `apps/backend/package.json`.
  
  File: `apps/backend/package.json` (partial)
  ```json
  "dependencies": {
    ...
    "playwright": "^1.57.0",
    "zod": "^4.4.3",
    "@open-resume/contracts": "workspace:*"
  }
  ```

- [ ] **Step 2: Update dependencies lockfile**
  Run: `pnpm install`
  Expected: Link generated for `@open-resume/contracts` inside `apps/backend/node_modules/`.

- [ ] **Step 3: Update apps/backend/src/schema.ts to re-export**
  Replace all content in `apps/backend/src/schema.ts` with:
  
  File: `apps/backend/src/schema.ts`
  ```typescript
  export * from "@open-resume/contracts";
  ```

- [ ] **Step 4: Run backend tests to verify**
  Run: `pnpm --filter @open-resume/backend test`
  Expected: All 12 backend tests pass successfully.

- [ ] **Step 5: Run typecheck on backend**
  Run: `pnpm --filter @open-resume/backend typecheck`
  Expected: Command exits successfully with no type errors.

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add apps/backend/package.json apps/backend/src/schema.ts pnpm-lock.yaml
  git commit -m "feat(backend): re-export schemas from shared contracts package"
  ```

---

### Task 4: Integrate Web Frontend

Hook up the frontend to use the contracts package and delete duplicated schemas.

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/lib/local-backend-client.ts`

- [ ] **Step 1: Add workspace dependency to frontend**
  Add `"@open-resume/contracts": "workspace:*"` to `dependencies` in `apps/web/package.json`.
  
  File: `apps/web/package.json` (partial)
  ```json
  "dependencies": {
    ...
    "zod": "^4.4.3",
    "zustand": "^5.0.14",
    "@open-resume/contracts": "workspace:*"
  }
  ```

- [ ] **Step 2: Update dependencies lockfile**
  Run: `pnpm install`
  Expected: Link generated for `@open-resume/contracts` inside `apps/web/node_modules/`.

- [ ] **Step 3: Update local-backend-client.ts to import from contracts**
  Modify [local-backend-client.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/lib/local-backend-client.ts) by removing lines 5 to 159 (the duplicate schemas and type declarations) and importing them from `@open-resume/contracts`.
  
  File: `apps/web/src/lib/local-backend-client.ts` (partial)
  ```typescript
  import { z } from "zod";
  import {
    backendJobSchema,
    backendJobsResponseSchema,
    deleteJobResponseSchema,
    resumeContentSchema,
    resumeSummarySchema,
    resumeDetailsSchema,
    createResumeRequestSchema,
    updateResumeRequestSchema,
    targetRoleArchetypeSchema,
    candidateProfileSchema,
    resumeSyncRequestSchema,
    okResponseSchema,
    type BackendJob as LocalBackendJob,
    type TargetRoleArchetype,
    type CandidateProfile,
    type ResumeSyncRequest,
    type OkResponse,
    type ResumeContent,
    type ResumeSummary,
    type ResumeDetails,
    type CreateResumeRequest,
    type UpdateResumeRequest,
  } from "@open-resume/contracts";

  const backendBaseUrl = "http://127.0.0.1:47321";
  ...
  ```

- [ ] **Step 4: Run frontend tests**
  Run: `pnpm --filter @open-resume/web test`
  Expected: All frontend unit tests pass successfully.

- [ ] **Step 5: Run typecheck on frontend**
  Run: `pnpm --filter @open-resume/web typecheck`
  Expected: Command exits successfully with no type errors.

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add apps/web/package.json apps/web/src/lib/local-backend-client.ts pnpm-lock.yaml
  git commit -m "feat(web): use shared contracts package for backend client"
  ```

---

### Task 5: Final Verification

Validate the entire workspace.

- [ ] **Step 1: Run workspace verify**
  Run: `pnpm verify`
  Expected: All packages check, typecheck, test, and build successfully.
