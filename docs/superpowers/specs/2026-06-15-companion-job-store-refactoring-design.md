# Design: Companion Job Store Refactoring & Feature-Based Folder Structure

This document details the refactoring of companion job queue management to use a new Zustand store, resolving callback prop drilling across `CompanionJobCard` and `CompanionJobDetailsDialog`, and the migration of jobs-related files to a self-contained feature directory (`src/features/jobs`).

## Objectives
- Introduce a new Zustand store (`useCompanionJobStore`) to manage companion job state and actions.
- Resolve callback prop-drilling (`onConvert`, `onRetry`, `onRetryAnalyze`, `onDelete`) into `CompanionJobCard` and `CompanionJobDetailsDialog`.
- Reorganize the codebase by migrating all jobs-related code from `src/components/jobs/` and `src/lib/` to `src/features/jobs/` (introducing the Feature-Based layout).
- Clean up duplicate state and event handlers in `JobsDashboard` (`apps/web/src/routes/jobs.tsx`).
- Keep Zustand stores aligned with TypeScript best practices (using curried `create<T>()`).

---

## Proposed Folder Structure: `src/features/jobs`

All jobs-related state, logic, schemas, and UI components will be colocated in a single domain folder:
```
apps/web/src/features/jobs/
├── components/                       # UI components (moved from src/components/jobs/)
│   ├── ApplicationTrackerStep.tsx
│   ├── CompanionJobCard.tsx
│   ├── CompanionJobDetailsDialog.tsx
│   ├── CoverLetterStep.tsx
│   ├── FitBriefStep.tsx
│   ├── JobApplicationCard.tsx
│   ├── JobDetailsStep.tsx
│   ├── NewJobApplicationModal.tsx
│   ├── PipelineIntegrityPanel.tsx
│   ├── ResumeTailoringStep.tsx
│   └── TailoredResumePreview.tsx
├── companion-job-store.ts            # [NEW] Zustand store for companion jobs
├── companion-job-store.test.ts       # [NEW] Tests for companion jobs store
├── job-application-store.ts          # Zustand store for job applications (moved from src/lib/)
├── job-application-store.test.ts     # Tests for job application store (moved from src/lib/)
├── job-application-schema.ts         # Zod schemas (moved from src/lib/)
├── job-application-export.ts         # PDF/export helpers (moved from src/lib/)
├── job-application-export.test.ts    # Tests for export helpers (moved from src/lib/)
├── job-ai.ts                         # AI/Fit analysis helpers (moved from src/lib/)
└── job-ai.test.ts                    # Tests for AI helpers (moved from src/lib/)
```

---

## Proposed Changes

### 1. File Migration & Import Updates
- Move components from `apps/web/src/components/jobs/` to `apps/web/src/features/jobs/components/`.
- Move job files from `apps/web/src/lib/` to `apps/web/src/features/jobs/`.
- Update internal imports within `src/features/jobs/` to use relative paths (e.g. `./job-application-schema` instead of `#/lib/job-application-schema`).
- Update external imports in `routes/jobs.tsx` and other pages to point to `#/features/jobs/components/...` or `#/features/jobs/...`.

### 2. New Store: [companion-job-store.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/companion-job-store.ts)

Create a typed Zustand store to manage the queue cache, loading/error states, and async actions:
- **State**:
  - `companionJobs`: `LocalCompanionJob[]`
  - `isLoading`: `boolean`
  - `error`: `string | null`
- **Actions**:
  - `fetchJobs()`: Calls `listCompanionJobs()` and updates store state.
  - `retryJobCrawl(id: string)`: Calls `retryCompanionJobCrawl(id)` and calls `fetchJobs()`.
  - `retryJobAnalyze(id: string)`: Calls `retryCompanionJobAnalyze(id)` and calls `fetchJobs()`.
  - `deleteJob(id: string)`: Calls `deleteCompanionJob(id)` and calls `fetchJobs()`.
  - `convertJobToApplication(job: LocalCompanionJob)`:
    - Invokes `createJobApplication` and `saveFitBrief` from `./job-application-store` directly.
    - Deletes the companion job using `deleteCompanionJob(job.id)`.
    - Refreshes the local queue (`fetchJobs()`).
    - Returns the newly created `appId` for navigation.

### 3. Modify: [CompanionJobDetailsDialog.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/CompanionJobDetailsDialog.tsx)

- Remove the following callback props from `CompanionJobDetailsDialogProps`:
  - `onConvert`, `onRetry`, `onRetryAnalyze`
- Import `useCompanionJobStore` and `useNavigate`.
- Update the dialog action buttons to call store actions.

### 4. Modify: [CompanionJobCard.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/CompanionJobCard.tsx)

- Remove all callback props from `CompanionJobCardProps`.
- Import `useCompanionJobStore`.
- Update the card action buttons and details dialog portal to call store actions directly.

### 5. Modify: [jobs.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/routes/jobs.tsx)

- Remove local state: `companionJobs`, `loadError`.
- Remove local handler methods: `handleRetry`, `handleRetryAnalyze`, `handleDelete`, `handleConvert`.
- Use selectors to bind to `companionJobs`, `fetchJobs`, and `error` from `useCompanionJobStore`.
- Update the `useEffect` polling and rendering logic to render `<CompanionJobCard key={job.id} job={job} />` without any action props.

---

## Verification Plan

### Automated Tests
- Run TypeScript compilation check: `pnpm typecheck`.
- Run Vitest test suite: `pnpm test`.
- Ensure all moved test files run and pass.

### Manual Verification
1. Access the jobs dashboard.
2. Verify companion jobs are listed and successfully polled.
3. Click "Retry Scrape" or "Retry AI Analysis" on failed jobs.
4. Click "View Details" to open a dialog.
5. Click "Convert to Application" and verify redirection to the new job page.
