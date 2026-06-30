# Profile-Based Backend Job Scoring & Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement local-first candidate profile settings via a graphical user interface (GUI) on the frontend, and enable the backend to automatically parse, evaluate, and score crawled job descriptions against the candidate's profile and default resume. Support DeepSeek API as a first-class AI provider and mirror Career-Ops evaluation prompts.

---

## File Structure

- Modify `apps/backend/package.json`
  - Add `ai`, `@ai-sdk/openai`, and `@ai-sdk/google` dependencies.
- Modify `apps/backend/src/schema.ts`
  - Extend job and API models for parsed details, compatibility score, fit brief, and `/profile` JSON endpoints.
- Modify `apps/backend/src/jobs/repository.ts`
  - Extend SQLite table and queries for scoring and parsing fields.
- Modify `apps/backend/src/jobs/crawl-queue.ts`
  - Orchestrate crawl -> analyze (AI scoring) -> ready lifecycle.
- Create `apps/backend/src/jobs/ai-analyzer.ts`
  - Implement LLM prompt building (mirroring Career-Ops scoring prompts), model execution (including DeepSeek), and validation for job details & suitability analysis.
- Modify `apps/backend/src/server.ts`
  - Expose `/profile` and `/profile/resume` endpoints, and include scoring data in `/jobs` responses.
- Modify `apps/web/src/lib/local-backend-client.ts`
  - Add client helpers for profile GET/PUT and resume sync.
- Create `apps/web/src/routes/profile.tsx`
  - A profile editing route featuring a structured form editor and resume sync status.
- Modify `apps/web/src/routes/jobs.tsx`
  - Restore the active Job Applications dashboard and filter buttons. Display ready backend jobs with parsed details and compatibility scores.
- Modify `apps/web/src/components/jobs/BackendJobCard.tsx`
  - Render compatibility scores and a "Convert to Application" button for ready jobs.
- Modify `apps/web/src/components/jobs/NewJobApplicationModal.tsx`
  - Add a toggle/tab to allow manual job application creation alongside URL entry.

---

## Task 1: Sync Profile and Resume Endpoints

**Files:**
- Modify: `apps/backend/src/schema.ts`
- Modify: `apps/backend/src/server.ts`
- Modify: `apps/backend/src/jobs/repository.ts`
- Test: `apps/backend/src/server.test.ts`

- [ ] **Step 1: Extend backend schemas**
  - Add Zod schema for UserProfile (JSON format).
  - Add GET/PUT schemas for `/profile` and `/profile/resume`.
- [ ] **Step 2: Implement `/profile` and `/profile/resume` endpoints**
  - GET `/profile` reads `apps/backend/config/profile.json`. If missing, creates a default template.
  - PUT `/profile` writes the structured JSON to `apps/backend/config/profile.json`.
  - GET `/profile/resume` and PUT `/profile/resume` cache the default resume JSON in SQLite or in a local file (e.g. `.open-resume-backend/resume.json`).
- [ ] **Step 3: Verify with unit tests**
  - Write route tests to verify reading/writing profile JSON and syncing resume JSON.

---

## Task 2: Database and Repository Extensions

**Files:**
- Modify: `apps/backend/src/jobs/repository.ts`
- Test: `apps/backend/src/jobs/repository.test.ts`

- [ ] **Step 1: Update SQLite migrations**
  - Update `repository.ts` initialization to add columns to the `jobs` table if they do not exist:
    - `parsed_title`, `parsed_company`, `parsed_location`, `parsed_description`, `fit_score` (INTEGER), and `fit_brief_json`.
- [ ] **Step 2: Update row mapping & CRUD operations**
  - Update `listJobs`, `getJob`, and mapping functions to handle the new columns.
  - Add `markAnalyzing(id, now)`.
  - Update `markReady(id, data)` to accept parsed details, fit brief, and score, saving them to SQLite.
- [ ] **Step 3: Update repository tests**
  - Assert that parsed details, score, and fit brief are correctly persisted and retrieved.

---

## Task 3: Backend AI Interpretation & Scoring (DeepSeek & Career-Ops Mirror)

**Files:**
- Create: `apps/backend/src/jobs/ai-analyzer.ts`
- Modify: `apps/backend/src/jobs/crawl-queue.ts`
- Test: `apps/backend/src/jobs/ai-analyzer.test.ts`

- [ ] **Step 1: Add AI SDK dependencies**
  - Run `pnpm --filter @open-resume/backend add ai @ai-sdk/openai @ai-sdk/google`.
- [ ] **Step 2: Implement `ai-analyzer.ts`**
  - Load environment variables for AI provider keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`).
  - Implement prompt templates comparing the job description against `profile.json` and `resume.json`.
  - Prompt structure must mirror Career-Ops: A-F fit assessment across dimensions (North-Star Alignment, Superpowers, Comp/Location, Red Flags) and aggregate score (0-100).
  - Enforce JSON mode to extract structured details and fit brief properties (strengths, gaps, risks, score 0-100).
  - Configure DeepSeek API integration (`baseURL: "https://api.deepseek.com/v1"`, model `"deepseek-chat"`).
- [ ] **Step 3: Update crawl queue sequence**
  - Modify `crawl-queue.ts` run sequence:
    1. Crawl URL.
    2. Save raw/cleaned text and transition to `analyzing`.
    3. Run the AI analyzer.
    4. Save scoring/parsing outputs and transition to `ready`.
  - Handle analyzer failures gracefully (e.g. log errors, transition to `ready` with empty scores, or transition to `failed` depending on user preference).
- [ ] **Step 4: Verify analyzer logic**
  - Test prompt generation, parser logic, and mock LLM calls.

---

## Task 4: Profile GUI Editor & Resume Auto-Sync

**Files:**
- Modify: `apps/web/src/lib/local-backend-client.ts`
- Create: `apps/web/src/routes/profile.tsx`
- Modify: `apps/web/src/routes/__root.tsx` (add navigation link)
- Modify: `apps/web/src/lib/resume-store.ts` (or create a sync effect)

- [ ] **Step 1: Add client API helpers**
  - Implement `getProfile()`, `updateProfile(profileJson)`, and `syncResume(resumeJson)`.
- [ ] **Step 2: Implement Profile Form GUI**
  - Create a `/profile` route with a structured layout:
    - **Contact Info Tab**: Basic inputs (name, email, github, website, etc.).
    - **Target Roles Tab**: Editable list for primary roles and target archetypes.
    - **Narrative Tab**: Text areas for headline, exit story, and editable list for superpowers.
    - **Proof Points Tab**: List editor for achievements with URL and metric inputs.
    - **Compensation & Location Tab**: Target ranges, timezone, availability, and policy options.
  - Add visual status indicating if the candidate resume is synced.
- [ ] **Step 3: Add auto-sync hook**
  - Sync the default resume to the backend when the web app loads or when the default resume is edited.

---

## Task 5: Restoring the Active Dashboard & Conversion Flow

**Files:**
- Modify: `apps/web/src/routes/jobs.tsx`
- Modify: `apps/web/src/components/jobs/BackendJobCard.tsx`
- Modify: `apps/web/src/components/jobs/NewJobApplicationModal.tsx`

- [ ] **Step 1: Combine dashboards**
  - Render the active job applications pipeline (using `JobApplicationCard`s and status filters) as the main view.
  - Render the backend crawler queue in a dedicated, collapsible top drawer or panel.
- [ ] **Step 2: Update job queue cards**
  - Display the parsed job title, company, and compatibility fit score badge on the card instead of the raw hostname URL.
- [ ] **Step 3: Implement conversion action**
  - Clicking "Convert to Application" calls `createJobApplication` in the frontend store using the pre-analyzed details and fit brief. It deletes the backend job and navigates the user to the workspace.
- [ ] **Step 4: Restore manual application creation**
  - Restore the manual job creation form in `NewJobApplicationModal` so users can bypass the crawler queue if needed.

---

## Task 6: End-to-End Verification

- [ ] Run full project type checking and tests workspace-wide:
  ```bash
  pnpm verify
  ```
- [ ] Smoke-test:
  1. Edit candidate profile in `/profile` using the GUI forms.
  2. Sync resume.
  3. Submit a job URL.
  4. Verify background crawl -> analyze lifecycle completes.
  5. Verify compatibility score renders.
  6. Click "Convert to Application" and verify redirection to the fully populated workspace.
