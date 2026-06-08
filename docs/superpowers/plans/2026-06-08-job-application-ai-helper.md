# Job Application AI Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first job application workspace inspired by Career-Ops, where each job stores a complete application packet: job description, fit brief, tailored resume snapshot, cover letter draft, notes, follow-ups, and tracker status.

**Architecture:** Keep the MVP browser-local and app-native. Use typed Zustand stores persisted to `localStorage`, reuse the existing resume schema/templates/export logic, and add structured AI helper functions that produce durable artifacts rather than transient chat output. Do not add a backend, job portal scanner, batch processing, or auto-application behavior in this first implementation.

**Tech Stack:** TanStack Start, React 19, TypeScript, Zustand, Zod, Vite, Tailwind CSS v4, Vitest, existing AI SDK provider settings.

---

## Product Context

This plan incorporates `docs/superpowers/specs/2026-06-08-career-ops-inspiration.md`.

Career-Ops ideas to adapt:

- Treat job search as a repeatable pipeline.
- Store a durable application packet per job.
- Use fit filtering before tailoring.
- Keep AI human-in-the-loop.
- Separate source resume from job-specific tailored resume.
- Prefer local-first privacy and portable exports.

Career-Ops ideas to defer:

- CLI-first workflows.
- File-backed state as the primary app storage.
- Portal scanning.
- Batch evaluation.
- Automated form filling.
- Heavy numerical scoring.

## File Structure

- Create `src/lib/job-application-schema.ts` for Zod schemas and exported types.
- Create `src/lib/job-application-store.ts` for persisted job application state and integrity helpers.
- Modify `src/lib/resume-index-store.ts` to persist `defaultResumeId`.
- Create `src/lib/job-ai.ts` for structured AI prompt helpers.
- Create `src/lib/job-application-export.ts` for JSON/Markdown export helpers.
- Create `src/routes/jobs.tsx` for the job dashboard.
- Create `src/routes/jobs/$id.tsx` for the guided job workspace.
- Create focused components under `src/components/jobs/` for the dashboard cards, guided steps, fit brief, proposal review, cover letter editor, and status controls.
- Add tests beside the new store/helper files.

## Data Model

The MVP stores user-owned artifacts in `localStorage`. Generated artifacts are first-class data, not chat history.

```typescript
export type JobApplicationStatus =
	| "saved"
	| "analyzing"
	| "tailoring"
	| "applied"
	| "interviewing"
	| "offer"
	| "rejected"
	| "archived";

export type ResumeEditProposalStatus =
	| "pending"
	| "approved"
	| "rejected"
	| "applied";

export type ResumeEditTarget =
	| { section: "summary" }
	| { section: "experience"; itemId: string; field: "role" | "description" }
	| { section: "experience"; itemId: string; field: "bullet"; bulletIndex: number }
	| { section: "skills"; itemId: string; field: "items" }
	| { section: "projects"; itemId: string; field: "description" };

export interface ResumeEditProposal {
	id: string;
	target: ResumeEditTarget;
	currentText: string;
	suggestedText: string;
	rationale: string;
	status: ResumeEditProposalStatus;
	createdAt: number;
	appliedAt?: number;
}

export interface JobFitBrief {
	roleSummary: string;
	requirements: string[];
	keywords: string[];
	strengths: string[];
	gaps: string[];
	risks: string[];
	nextActions: string[];
	generatedAt: number;
}

export interface CoverLetterDraft {
	content: string;
	generatedAt: number;
	updatedAt: number;
}

export interface JobApplication {
	id: string;
	company: string;
	title: string;
	location: string;
	sourceUrl: string;
	description: string;
	status: JobApplicationStatus;
	sourceResumeId: string | null;
	sourceResumeName: string | null;
	sourceResumeSnapshot: Resume | null;
	tailoredResume: Resume | null;
	fitBrief: JobFitBrief | null;
	resumeEditProposals: ResumeEditProposal[];
	coverLetterDraft: CoverLetterDraft | null;
	notes: string;
	followUpAt: number | null;
	createdAt: number;
	updatedAt: number;
}
```

## Task 1: Default Resume Selection

**Files:**

- Modify: `src/lib/resume-index-store.ts`
- Test: `src/lib/resume-index-store.test.ts`
- Modify: `src/routes/resumes.tsx`

- [ ] Add `defaultResumeId: string | null` and `setDefaultResumeId(id: string | null)` to the resume index store.
- [ ] Persist `defaultResumeId` with the existing `resume-index` localStorage payload.
- [ ] If the default resume is deleted, clear `defaultResumeId`.
- [ ] Add a default-resume control to each resume card or dashboard action area.
- [ ] Test hydration, default selection, and delete-clears-default behavior.

Run:

```bash
pnpm test src/lib/resume-index-store.test.ts
```

Expected: store tests pass.

## Task 2: Job Application Store

**Files:**

- Create: `src/lib/job-application-schema.ts`
- Create: `src/lib/job-application-store.ts`
- Test: `src/lib/job-application-store.test.ts`

- [ ] Define schemas and types for job applications, fit briefs, resume edit proposals, cover letter drafts, and statuses.
- [ ] Implement `useJobApplicationStore` with actions:
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
  - `validatePipeline`
- [ ] Persist the store under `job-applications`.
- [ ] `ensureTailoredResume` must copy the current default resume only when tailoring begins.
- [ ] Store `sourceResumeId`, `sourceResumeName`, `sourceResumeSnapshot`, and `tailoredResume` when the copy is created.
- [ ] `applyResumeEditProposal` must only mutate `tailoredResume`, never the saved source resume.
- [ ] `validatePipeline` should report missing descriptions, missing default resume for untailored jobs, stale proposal targets, and jobs with no title/company.

Run:

```bash
pnpm test src/lib/job-application-store.test.ts
```

Expected: store tests pass.

## Task 3: Structured AI Helpers

**Files:**

- Create: `src/lib/job-ai.ts`
- Test: `src/lib/job-ai.test.ts`

- [ ] Implement pure prompt-building helpers for:
  - `buildJobAnalysisPrompt(job, resume)`
  - `buildResumeTailoringPrompt(job, fitBrief, tailoredResume)`
  - `buildCoverLetterPrompt(job, fitBrief, tailoredResume)`
- [ ] Implement parsing helpers for structured JSON responses:
  - `parseJobFitBrief`
  - `parseResumeEditProposals`
  - `parseCoverLetterDraft`
- [ ] Keep provider execution isolated behind functions that receive provider config and input data.
- [ ] Require AI output to map into the typed artifact model; return user-facing errors for invalid JSON or unsupported proposal targets.
- [ ] Prompts must forbid inventing experience and must ask the model to ground suggestions in the existing resume and job description.

Run:

```bash
pnpm test src/lib/job-ai.test.ts
```

Expected: parser and prompt tests pass.

## Task 4: Jobs Dashboard

**Files:**

- Create: `src/routes/jobs.tsx`
- Create: `src/components/jobs/JobApplicationCard.tsx`
- Create: `src/components/jobs/NewJobApplicationModal.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/components/editor/EditorHeader.tsx`

- [ ] Add `/jobs` as the dashboard for job applications.
- [ ] Show empty state, create-job action, status filters, and job cards.
- [ ] Job cards should show company, title, status, default/source resume state, and last updated date.
- [ ] Add navigation entry points from the landing page and editor header.
- [ ] Keep the dashboard work-focused and scannable; no marketing-style hero.

Run:

```bash
pnpm typecheck
```

Expected: no TypeScript errors.

## Task 5: Guided Job Workspace

**Files:**

- Create: `src/routes/jobs/$id.tsx`
- Create: `src/components/jobs/JobDetailsStep.tsx`
- Create: `src/components/jobs/FitBriefStep.tsx`
- Create: `src/components/jobs/ResumeTailoringStep.tsx`
- Create: `src/components/jobs/CoverLetterStep.tsx`
- Create: `src/components/jobs/ApplicationTrackerStep.tsx`

- [ ] Add `/jobs/$id` with a guided workspace layout.
- [ ] Step 1 edits job details and job description.
- [ ] Step 2 generates and displays the fit brief artifact.
- [ ] Step 3 creates the tailored resume on first tailoring and reviews per-change AI proposals.
- [ ] Step 4 generates and edits a cover letter draft.
- [ ] Step 5 updates application status, notes, and follow-up date.
- [ ] Always show the current next action based on missing artifacts.
- [ ] Preserve human approval: generated edits are proposals until accepted.

Run:

```bash
pnpm typecheck
```

Expected: no TypeScript errors.

## Task 6: Tailored Resume Preview And Export

**Files:**

- Create: `src/components/jobs/TailoredResumePreview.tsx`
- Create: `src/lib/job-application-export.ts`
- Modify: `src/routes/jobs/$id.tsx`

- [ ] Reuse existing resume templates to preview `tailoredResume`.
- [ ] Add export actions for:
  - tailored resume Markdown
  - application packet JSON
  - cover letter Markdown
- [ ] Exported application JSON should include job details, fit brief, tailored resume, proposals, cover letter, notes, status, and timestamps.
- [ ] Do not export API keys or provider settings.

Run:

```bash
pnpm test src/lib/job-application-export.test.ts
pnpm typecheck
```

Expected: export tests and typecheck pass.

## Task 7: Pipeline Integrity And Recovery

**Files:**

- Modify: `src/lib/job-application-store.ts`
- Create: `src/components/jobs/PipelineIntegrityPanel.tsx`
- Modify: `src/routes/jobs.tsx`

- [ ] Surface integrity warnings in the jobs dashboard.
- [ ] Warn when a job has no description, no title/company, no source resume, proposal targets that no longer exist, or an archived job with pending proposals.
- [ ] Provide non-destructive recovery actions where possible:
  - clear stale proposal
  - select source resume
  - archive incomplete job
- [ ] Never silently mutate tailored resumes during recovery.

Run:

```bash
pnpm test src/lib/job-application-store.test.ts
pnpm typecheck
```

Expected: integrity tests and typecheck pass.

## Task 8: Full Verification

**Files:**

- No new files.

- [ ] Run unit tests.
- [ ] Run TypeScript checking.
- [ ] Run production build.
- [ ] Manually smoke-test:
  - create a default resume
  - create a job application
  - paste a job description
  - generate a fit brief
  - create a tailored resume snapshot
  - approve one resume proposal
  - verify the source resume did not change
  - generate/edit cover letter
  - export application packet

Run:

```bash
pnpm verify
```

Expected: typecheck, tests, and build pass.

## Acceptance Criteria

- Users can choose a default resume.
- Users can create and manage job application workspaces.
- Each job stores durable artifacts: job details, description, fit brief, tailored resume, proposal list, cover letter, notes, status, and follow-up date.
- Tailoring creates a job-specific resume copy on first tailoring.
- Resume proposals are approved or rejected per change.
- Approved proposals mutate only the job-specific tailored resume.
- Original resumes remain unchanged by job tailoring.
- Users can preview and export the tailored resume/application packet.
- The app remains browser-local and does not introduce a backend.
- The app does not auto-submit applications or automate portal form filling.

## Future Backend Notes

Do not build this in the MVP. When needed, add a Cloudflare-backed sync layer:

- TanStack Start server functions for authenticated APIs.
- D1 or Postgres for structured job/resume/application records.
- R2 for exported PDFs and application packet artifacts.
- Server-side AI calls only after there is an account/security model.
- Optional import path from the local MVP data shape into hosted storage.
