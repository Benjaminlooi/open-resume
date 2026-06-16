# SQLite-Backed Job Applications & Backend Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move job applications storage and conversion logic from frontend-only local storage to the companion backend SQLite database.

**Architecture:** We will declare Zod contracts for job applications in `@open-resume/contracts`, create a `job_applications` table in the SQLite database, expose Fastify REST CRUD routes and a conversion endpoint `/jobs/:id/convert` in `apps/companion`, and update the web frontend client and Zustand store to talk to the backend.

**Tech Stack:** Fastify, node:sqlite, Zustand, TanStack Start, Zod, Vitest.

---

### Task 1: Shared Job Application Contracts

**Files:**
- Create: `packages/contracts/src/job-applications.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Create `job-applications.ts`**
  Create the shared job applications schemas:
  ```typescript
  import { z } from "zod";
  import { resumeContentSchema } from "./resumes.js";
  import { jobFitBriefSchema } from "./jobs.js";

  export const jobApplicationStatusSchema = z.enum([
  	"saved",
  	"analyzing",
  	"tailoring",
  	"applied",
  	"interviewing",
  	"offer",
  	"rejected",
  	"archived",
  ]);

  export type JobApplicationStatus = z.infer<typeof jobApplicationStatusSchema>;

  export const resumeEditProposalStatusSchema = z.enum([
  	"pending",
  	"approved",
  	"rejected",
  	"applied",
  ]);

  export type ResumeEditProposalStatus = z.infer<
  	typeof resumeEditProposalStatusSchema
  >;

  export const resumeEditTargetSchema = z.union([
  	z.object({ section: z.literal("summary") }),
  	z.object({
  		section: z.literal("experience"),
  		itemId: z.string(),
  		field: z.enum(["role", "description"]),
  	}),
  	z.object({
  		section: z.literal("experience"),
  		itemId: z.string(),
  		field: z.literal("bullet"),
  		bulletIndex: z.number(),
  	}),
  	z.object({
  		section: z.literal("skills"),
  		itemId: z.string(),
  		field: z.literal("items"),
  	}),
  	z.object({
  		section: z.literal("projects"),
  		itemId: z.string(),
  		field: z.literal("description"),
  	}),
  ]);

  export type ResumeEditTarget = z.infer<typeof resumeEditTargetSchema>;

  export const resumeEditProposalSchema = z.object({
  	id: z.string(),
  	target: resumeEditTargetSchema,
  	currentText: z.string(),
  	suggestedText: z.string(),
  	rationale: z.string(),
  	status: resumeEditProposalStatusSchema,
  	createdAt: z.number(),
  	appliedAt: z.number().optional(),
  });

  export type ResumeEditProposal = z.infer<typeof resumeEditProposalSchema>;

  export const coverLetterDraftSchema = z.object({
  	content: z.string(),
  	generatedAt: z.number(),
  	updatedAt: z.number(),
  });

  export type CoverLetterDraft = z.infer<typeof coverLetterDraftSchema>;

  export const jobApplicationSchema = z.object({
  	id: z.string().min(1),
  	company: z.string(),
  	title: z.string(),
  	location: z.string(),
  	sourceUrl: z.string(),
  	description: z.string(),
  	status: jobApplicationStatusSchema,
  	sourceResumeId: z.string().nullable(),
  	sourceResumeName: z.string().nullable(),
  	sourceResumeSnapshot: resumeContentSchema.nullable(),
  	tailoredResume: resumeContentSchema.nullable(),
  	fitBrief: jobFitBriefSchema.nullable(),
  	resumeEditProposals: z.array(resumeEditProposalSchema),
  	coverLetterDraft: coverLetterDraftSchema.nullable(),
  	notes: z.string(),
  	followUpAt: z.number().nullable(),
  	createdAt: z.number(),
  	updatedAt: z.number(),
  });

  export type JobApplication = z.infer<typeof jobApplicationSchema>;

  export const jobApplicationsResponseSchema = z.object({
  	jobApplications: z.array(jobApplicationSchema),
  }).strict();

  export type JobApplicationsResponse = z.infer<typeof jobApplicationsResponseSchema>;
  ```

- [ ] **Step 2: Export and Register in `packages/contracts/src/index.ts`**
  Modify exports and registry setup:
  ```typescript
  // Add to imports
  import {
  	jobApplicationSchema,
  	jobApplicationsResponseSchema,
  } from "./job-applications.js";

  // Re-export
  export * from "./job-applications.js";

  // Add registry calls in the if (registry) block:
  registry.add(jobApplicationSchema, { id: "JobApplication" });
  registry.add(jobApplicationsResponseSchema, { id: "JobApplicationsResponse" });
  ```

- [ ] **Step 3: Run Typecheck**
  Run: `pnpm --filter @open-resume/contracts typecheck`
  Expected: Success without errors.

- [ ] **Step 4: Commit**
  Run: `git add packages/contracts` and commit.

---

### Task 2: SQLite Schema Migration & Repository CRUD

**Files:**
- Modify: `apps/companion/src/schema.ts`
- Modify: `apps/companion/src/jobs/repository.ts`
- Modify: `apps/companion/src/jobs/repository.test.ts`

- [ ] **Step 1: Re-export from `apps/companion/src/schema.ts`**
  Add any exports/imports for Job Applications if necessary. Since `src/schema.ts` does `export * from "@open-resume/contracts"`, it will automatically export the new schemas.

- [ ] **Step 2: Add table and CRUD methods to `repository.ts`**
  Update `database.exec` to create `job_applications` table:
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

  Implement the mapping helper:
  ```typescript
  interface JobApplicationRow {
  	id: string;
  	company: string;
  	title: string;
  	location: string;
  	source_url: string;
  	description: string;
  	status: string;
  	source_resume_id: string | null;
  	source_resume_name: string | null;
  	source_resume_snapshot_json: string | null;
  	tailored_resume_json: string | null;
  	fit_brief_json: string | null;
  	resume_edit_proposals_json: string | null;
  	cover_letter_draft_json: string | null;
  	notes: string;
  	follow_up_at: number | null;
  	created_at: number;
  	updated_at: number;
  }

  function mapJobApplication(row: JobApplicationRow): any {
  	return {
  		id: row.id,
  		company: row.company,
  		title: row.title,
  		location: row.location,
  		sourceUrl: row.source_url,
  		description: row.description,
  		status: row.status,
  		sourceResumeId: row.source_resume_id,
  		sourceResumeName: row.source_resume_name,
  		sourceResumeSnapshot: row.source_resume_snapshot_json ? JSON.parse(row.source_resume_snapshot_json) : null,
  		tailoredResume: row.tailored_resume_json ? JSON.parse(row.tailored_resume_json) : null,
  		fitBrief: row.fit_brief_json ? JSON.parse(row.fit_brief_json) : null,
  		resumeEditProposals: row.resume_edit_proposals_json ? JSON.parse(row.resume_edit_proposals_json) : [],
  		coverLetterDraft: row.cover_letter_draft_json ? JSON.parse(row.cover_letter_draft_json) : null,
  		notes: row.notes,
  		followUpAt: row.follow_up_at,
  		createdAt: row.created_at,
  		updatedAt: row.updated_at,
  	};
  }
  ```

  Implement CRUD methods returned by `createJobRepository`:
  - `listJobApplications()`
  - `getJobApplication(id)`
  - `createJobApplication(input)`
  - `updateJobApplication(id, updates)`
  - `deleteJobApplication(id)`
  - `convertJobToApplication(jobId, now)`:
    ```typescript
    convertJobToApplication(jobId: string, now: number) {
        const job = getJob(jobId);
        if (!job) return null;

        const url = new URL(job.sourceUrl);
        const company = job.parsedCompany || url.hostname;
        const title = job.parsedTitle || "Untitled Job";
        const location = job.parsedLocation || "";
        const description = job.parsedDescription || job.cleanedText;

        const appId = randomUUID(); // or generate in JavaScript side

        let fitBrief = null;
        if (job.fitBriefJson) {
            try {
                fitBrief = JSON.parse(job.fitBriefJson);
            } catch {}
        }

        database.exec("BEGIN TRANSACTION;");
        try {
            database.prepare(`
                insert into job_applications (
                    id, company, title, location, source_url, description, status,
                    source_resume_id, source_resume_name, source_resume_snapshot_json,
                    tailored_resume_json, fit_brief_json, resume_edit_proposals_json,
                    cover_letter_draft_json, notes, follow_up_at, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, 'saved', null, null, null, null, ?, '[]', null, '', null, ?, ?)
            `).run(
                appId, company, title, location, job.sourceUrl, description,
                fitBrief ? JSON.stringify(fitBrief) : null, now, now
            );

            database.prepare("delete from jobs where id = ?").run(jobId);
            database.exec("COMMIT;");
        } catch (e) {
            database.exec("ROLLBACK;");
            throw e;
        }

        return getJobApplication(appId);
    }
    ```

- [ ] **Step 3: Write tests in `repository.test.ts`**
  Add unit tests for creating, getting, listing, updating, deleting job applications, and converting.

- [ ] **Step 4: Run Tests**
  Run: `pnpm companion:test`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run: `git commit -am "feat(companion): add sqlite storage for job applications"`

---

### Task 3: Companion API Routes

**Files:**
- Create: `apps/companion/src/routes/job-application-routes.ts`
- Modify: `apps/companion/src/routes/job-routes.ts`
- Modify: `apps/companion/src/routes/context.ts`
- Modify: `apps/companion/src/server.ts`
- Modify: `apps/companion/src/server.test.ts`

- [ ] **Step 1: Update Context types in `routes/context.ts`**
  Define context interface `JobApplicationRouteContext` and include it in routes initialization context.

- [ ] **Step 2: Create `job-application-routes.ts`**
  Implement endpoints:
  - `GET /job-applications`
  - `POST /job-applications`
  - `GET /job-applications/:id`
  - `PUT /job-applications/:id`
  - `DELETE /job-applications/:id`

- [ ] **Step 3: Add `POST /jobs/:id/convert` in `job-routes.ts`**
  Call `jobRepository.convertJobToApplication(request.params.id, Date.now())` and delete screenshot path.

- [ ] **Step 4: Register routes in `server.ts`**
  Add `server.register(createJobApplicationRoutes({ jobRepository }))`.

- [ ] **Step 5: Add integration tests in `server.test.ts`**
  Test conversion and CRUD routes.

- [ ] **Step 6: Run Tests**
  Run: `pnpm companion:test`
  Expected: PASS

- [ ] **Step 7: Re-generate OpenAPI Spec**
  Run: `pnpm companion:openapi`

- [ ] **Step 8: Commit**
  Run: `git add . && git commit -m "feat(companion): add api endpoints for job applications and conversion"`

---

### Task 4: Frontend Local Companion Client

**Files:**
- Modify: `apps/web/src/lib/local-companion-client.ts`
- Modify: `apps/web/src/lib/local-companion-client.test.ts`

- [ ] **Step 1: Expose API helpers in `local-companion-client.ts`**
  Add CRUD wrappers and `convertJobToApplication(id)`.

- [ ] **Step 2: Mock and verify in `local-companion-client.test.ts`**
  Update tests to test client methods.

- [ ] **Step 3: Run Tests**
  Run: `pnpm web:test`
  Expected: PASS

- [ ] **Step 4: Commit**
  Run: `git commit -am "feat(web): update local companion client for job applications"`

---

### Task 5: Zustand Store Refactoring

**Files:**
- Modify: `apps/web/src/features/jobs/job-application-store.ts`
- Modify: `apps/web/src/features/jobs/companion-job-store.ts`
- Modify: `apps/web/src/features/jobs/job-application-store.test.ts`

- [ ] **Step 1: Refactor `job-application-store.ts`**
  Update store actions to call `local-companion-client` endpoints, mutating client state, and removing localStorage subscription.

- [ ] **Step 2: Refactor `companion-job-store.ts`**
  Call client `convertJobToApplication(job.id)` in `convertJobToApplication` action.

- [ ] **Step 3: Refactor `job-application-store.test.ts`**
  Mock local companion client methods and verify store behavior.

- [ ] **Step 4: Run Tests**
  Run: `pnpm web:test`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run: `git commit -am "feat(web): connect job application store to companion backend"`

---

### Task 6: Workspace-wide Verification

- [ ] **Step 1: Run Verify**
  Run: `pnpm verify`
  Expected: PASS
