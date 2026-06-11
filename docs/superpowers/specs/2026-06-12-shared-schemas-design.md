# Design Spec: Shared Schemas and Types

Establish a single source of truth for Zod validation schemas and TypeScript types by moving them to a shared workspace package `@open-resume/contracts`.

## Architecture & Package Setup

We will create a new workspace package named `@open-resume/contracts` under `packages/contracts/`.

### 1. Enable Packages Directory in Monorepo
Modify [pnpm-workspace.yaml](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/pnpm-workspace.yaml) to include:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 2. Configure `@open-resume/contracts` Package
Create `packages/contracts/package.json` exposing the raw TypeScript source entry point:
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

Create `packages/contracts/tsconfig.json` with ESM setup:
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

---

## Schema Migration & Modular Structure

We will divide the schemas into domain modules under `packages/contracts/src/`:

1. **`src/common.ts`**: Common base validators (URLs, basic operational responses).
2. **`src/jobs.ts`**: Crawling, status tracking, and details extraction schemas for job application assistant.
3. **`src/resumes.ts`**: Resume summaries, details, and syncing schemas.
4. **`src/profiles.ts`**: Candidate profiles, narrative proof points, and archetypes.
5. **`src/index.ts`**: Public entry point re-exporting all sub-modules.

### 1. Backend Integration
Replace the contents of [schema.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/companion/src/schema.ts) with a clean re-export statement to minimize code modification in other backend controllers/handlers:
```typescript
// apps/companion/src/schema.ts
export * from "@open-resume/contracts";
```

In `apps/companion/package.json`, add `@open-resume/contracts` as a dependency:
```json
"dependencies": {
  "@open-resume/contracts": "workspace:*"
}
```

### 2. Frontend Integration
Remove duplicate schemas in [local-companion-client.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/lib/local-companion-client.ts) and replace them with imports from the contracts package:
```typescript
import {
  companionJobSchema,
  companionJobsResponseSchema,
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
  type CompanionJob as LocalCompanionJob,
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
```

In `apps/web/package.json`, add `@open-resume/contracts` as a dependency:
```json
"dependencies": {
  "@open-resume/contracts": "workspace:*"
}
```

---

## Verification & Unused Exports Detection

### Automated Verification
* `pnpm typecheck`: Validate imports and type satisfaction.
* `pnpm test`: Execute unit test suites.
* `pnpm build`: Verify clean compilation of client (`web`) and daemon (`companion`).

### Dead Code / Unused Schema Detection
We can run `pnpm dlx knip` at the workspace level to analyze compile dependencies and identify any unused exports in `@open-resume/contracts`.
