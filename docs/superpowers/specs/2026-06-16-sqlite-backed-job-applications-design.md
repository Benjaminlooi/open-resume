# Design: SQLite-Backed Job Applications & Backend Conversion

This specification details moving the storage and conversion logic of job applications from frontend-only `localStorage` to the companion backend SQLite database.

## 1. Shared Contracts (`@open-resume/contracts`)

We will introduce a new schema module for job applications in the shared contracts library:
- **File:** `packages/contracts/src/job-applications.ts`
- **Schemas Defined:**
  - `jobApplicationStatusSchema` (copied from `apps/web`)
  - `resumeEditProposalStatusSchema` (copied from `apps/web`)
  - `resumeEditTargetSchema` (copied from `apps/web`)
  - `resumeEditProposalSchema` (copied from `apps/web`)
  - `coverLetterDraftSchema` (copied from `apps/web`)
  - `jobApplicationSchema` (copied from `apps/web`)
- **Integration:** Export all schemas from `packages/contracts/src/index.ts` and register them in the fastify-type-provider-zod registry for OpenAPI/Swagger documentation generation.

---

## 2. SQLite Database & Repository (`apps/companion`)

The backend SQLite repository will be updated to manage the `job_applications` table.

### SQLite Schema Migration
Add the following table definition in the `createJobRepository` initialization SQL:

```sql
create table if not exists job_applications (
    id text primary key,
    company text not null,
    title text not null,
    location text not null,
    source_url text not null,
    description text not null,
    status text not null,
    source_resume_id text,
    source_resume_name text,
    source_resume_snapshot_json text,
    tailored_resume_json text,
    fit_brief_json text,
    resume_edit_proposals_json text,
    cover_letter_draft_json text,
    notes text not null default '',
    follow_up_at integer,
    created_at integer not null,
    updated_at integer not null
);
create index if not exists job_applications_updated_at_idx on job_applications(updated_at desc);
```

### Repository Methods
Add the following CRUD operations:
- `listJobApplications()`: Returns an array of job applications. JSON columns are parsed back to objects.
- `getJobApplication(id)`: Fetches a single job application by ID, parsing its JSON columns.
- `createJobApplication(app)`: Inserts a new job application. Objects/arrays are serialized to string before insertion.
- `updateJobApplication(id, updates)`: Updates an existing job application with partial updates, performing JSON serialization on complex fields if provided.
- `deleteJobApplication(id)`: Deletes a job application.
- `convertJobToApplication(jobId, now)`: Performed inside an SQLite transaction:
  1. Retrieves the companion job by ID.
  2. Extracts parameters (e.g. `company` = `job.parsedCompany` || hostname, `title` = `job.parsedTitle` || "Untitled Job", description, and fit brief).
  3. Inserts a new `job_applications` row.
  4. Deletes the companion job row.
  5. Returns the mapped `JobApplication` object.

---

## 3. Companion API Routes (`apps/companion`)

We will expose new routes on the companion Fastify server:

### CRUD Routes
- **Endpoint:** `/job-applications`
- **Methods:**
  - `GET /job-applications`: Lists all job applications.
  - `POST /job-applications`: Creates a new job application.
  - `GET /job-applications/:id`: Retrieves a single job application.
  - `PUT /job-applications/:id`: Updates a job application (handles status, proposals, drafts, notes, etc.).
  - `DELETE /job-applications/:id`: Deletes a job application.

### Conversion Route
- **Endpoint:** `POST /jobs/:id/convert`
- **Behavior:** Executes the repository's `convertJobToApplication` operation. Returns `200 OK` with the converted job application.

---

## 4. Web Frontend Refactoring (`apps/web`)

The frontend will use the new companion APIs and remove reliance on `localStorage` for job applications.

### Client Update
- **File:** `apps/web/src/lib/local-companion-client.ts`
- **Additions:**
  - Expose API client wrappers for:
    - `listJobApplications()`
    - `getJobApplication(id)`
    - `createJobApplication(app)`
    - `updateJobApplication(id, updates)`
    - `deleteJobApplication(id)`
    - `convertJobToApplication(jobId)`

### Zustand Store Integration
- **File:** `apps/web/src/features/jobs/job-application-store.ts`
- **Refactoring:**
  - Remove hydration and subscription for `localStorage`.
  - Add `fetchJobApplications()` action to fetch applications from the backend on app load/init.
  - Convert all modifying actions to call the respective backend client endpoints:
    - `createJobApplication`
    - `updateJobApplication`
    - `deleteJobApplication`
    - `setStatus`
    - `saveFitBrief`
    - `ensureTailoredResume`
    - `saveResumeEditProposals`
    - `applyResumeEditProposal`
    - `rejectResumeEditProposal`
    - `saveCoverLetterDraft`
    - `associateSourceResume`
    - `archiveIncompleteJob`
  - Update `useCompanionJobStore.ts` to delegate conversion to the backend `/jobs/:id/convert` endpoint rather than mapping fields in the frontend.

---

## Verification Plan

### Automated Tests
- Add unit tests for SQLite migrations and repository CRUD in `apps/companion/src/jobs/repository.test.ts`.
- Add integration tests for Fastify endpoints in `apps/companion/src/server.test.ts`.
- Update/adapt tests in `apps/web/src/features/jobs/job-application-store.test.ts` to mock/verify backend API calls.
- Run `pnpm verify` to check formatting, linting, type-checking, and test suite health across the workspace.
