# Separate Scrape Flow and AI Analysis Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the job scraping/crawling phase from the AI analysis phase so that AI analysis can be retried directly if the crawl succeeded but the AI analysis failed.

**Architecture:** 
1. Persist the crawled `cleanedText` when marking the job as `analyzing` in the SQLite database.
2. In the crawl queue manager, skip the crawling phase if `cleanedText` is already present.
3. Expose a new route `POST /jobs/:id/retry-analyze` on the Fastify server and in the React client.
4. Expose a "Retry AI Analysis" button on the frontend job card when a job fails but has `cleanedText`.
5. Show step-by-step progress feedback (`pending`, `crawling`, `analyzing`) in the UI card.

**Tech Stack:** Fastify, Zod, TanStack Start (React 19), Tailwind CSS, SQLite, Vitest

---

### Task 1: Job Repository changes

**Files:**
- Modify: `apps/backend/src/jobs/repository.ts`
- Modify: `apps/backend/src/jobs/repository.test.ts`

- [ ] **Step 1: Write failing tests in `repository.test.ts`**
  Add test cases to verify:
  1. `markAnalyzing` saves the passed `cleanedText` in the database.
  2. `resetForRetry` clears `cleaned_text` to `""`.
  3. `resetForAnalysisRetry` sets status to `'analyzing'`, clears `crawl_error`, and preserves `cleaned_text`.
  4. `listRunnableJobs` includes jobs with status `'analyzing'`.
  
  ```typescript
  // Add to apps/backend/src/jobs/repository.test.ts
  it("saves cleanedText in markAnalyzing", () => {
      const repository = createTestRepository();
      repository.createJob({ id: "job-1", sourceUrl: "https://example.com", now: 1000 });
      repository.markAnalyzing("job-1", "Sample cleaned text", 1100);
      expect(repository.getJob("job-1")).toMatchObject({
          crawlStatus: "analyzing",
          cleanedText: "Sample cleaned text",
          updatedAt: 1100,
      });
  });

  it("clears cleanedText to empty string on resetForRetry", () => {
      const repository = createTestRepository();
      repository.createJob({ id: "job-1", sourceUrl: "https://example.com", now: 1000 });
      repository.markAnalyzing("job-1", "Sample cleaned text", 1100);
      repository.resetForRetry("job-1", 1200);
      expect(repository.getJob("job-1")).toMatchObject({
          crawlStatus: "pending",
          cleanedText: "",
      });
  });

  it("resets status to analyzing and keeps cleanedText on resetForAnalysisRetry", () => {
      const repository = createTestRepository();
      repository.createJob({ id: "job-1", sourceUrl: "https://example.com", now: 1000 });
      repository.markAnalyzing("job-1", "Sample cleaned text", 1100);
      repository.markFailed("job-1", { error: "AI Failed", now: 1200 });
      repository.resetForAnalysisRetry("job-1", 1300);
      expect(repository.getJob("job-1")).toMatchObject({
          crawlStatus: "analyzing",
          crawlError: null,
          cleanedText: "Sample cleaned text",
      });
  });

  it("includes analyzing jobs in listRunnableJobs", () => {
      const repository = createTestRepository();
      repository.createJob({ id: "job-1", sourceUrl: "https://example.com", now: 1000 });
      repository.markAnalyzing("job-1", "Sample", 1100);
      const runnable = repository.listRunnableJobs();
      expect(runnable.map(j => j.id)).toContain("job-1");
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**
  Run command: `pnpm --filter @open-resume/backend test repository.test.ts`
  Expected: Failing tests for the new assertions.

- [ ] **Step 3: Modify repository implementation**
  Update `apps/backend/src/jobs/repository.ts` to implement the new signatures and methods:
  ```typescript
  // Modify markAnalyzing:
  markAnalyzing(id: string, cleanedText: string, now: number) {
      database
          .prepare(`
              update jobs
              set crawl_status = 'analyzing', crawl_error = null, cleaned_text = ?, updated_at = ?
              where id = ?
          `)
          .run(cleanedText, now, id);
      return getJob(id);
  },

  // Modify resetForRetry:
  resetForRetry(id: string, now: number) {
      database
          .prepare(`
              update jobs
              set crawl_status = 'pending', crawl_error = null, cleaned_text = '', updated_at = ?
              where id = ?
          `)
          .run(now, id);
      return getJob(id);
  },

  // Add resetForAnalysisRetry:
  resetForAnalysisRetry(id: string, now: number) {
      database
          .prepare(`
              update jobs
              set crawl_status = 'analyzing', crawl_error = null, updated_at = ?
              where id = ?
          `)
          .run(now, id);
      return getJob(id);
  },

  // Update listRunnableJobs:
  listRunnableJobs() {
      return database
          .prepare(`
              select * from jobs
              where crawl_status in ('pending', 'crawling', 'analyzing')
              order by created_at asc
          `)
          .all()
          .map((row) => mapJob(row as unknown as JobRow));
  },
  ```
  *Note: Make sure to also update `markAnalyzing` calls in existing test code in `apps/backend/src/jobs/repository.test.ts` to pass an empty string or dummy text.*

- [ ] **Step 4: Run tests to verify they pass**
  Run command: `pnpm --filter @open-resume/backend test repository.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run command:
  ```bash
  git add apps/backend/src/jobs/repository.ts apps/backend/src/jobs/repository.test.ts
  git commit -m "feat(backend): support persisting cleanedText on markAnalyzing and resetForAnalysisRetry"
  ```

---

### Task 2: Crawl Queue background worker changes

**Files:**
- Modify: `apps/backend/src/jobs/crawl-queue.ts`
- Modify: `apps/backend/src/jobs/crawl-queue.test.ts`

- [ ] **Step 1: Write failing tests in `crawl-queue.test.ts`**
  Add tests for:
  1. Bypassing crawl if `cleanedText` is already present.
  2. Preserving crawl timestamp if already present.
  3. Processing `analyzing` jobs in `enqueueRunnableJobs`.

  ```typescript
  // Add to apps/backend/src/jobs/crawl-queue.test.ts
  it("bypasses crawl and executes AI analysis when cleanedText is already populated", async () => {
      const repository = createTestRepository();
      createDefaultResume(repository);
      const job = repository.createJob({ id: "job-1", sourceUrl: "https://example.com", now: 1000 });
      // Pre-fill cleanedText
      repository.markAnalyzing("job-1", "Pre-scraped job text", 1100);

      const crawlSpy = vi.fn();
      const customAnalyze = vi.fn().mockResolvedValue({
          title: "Pre-scraped AI Engineer",
          company: "Pre OpenAI",
          location: "SF",
          description: "Details",
          fitScore: 99,
          fitBrief: {
              roleSummary: "Good fit",
              requirements: [],
              keywords: [],
              strengths: [],
              gaps: [],
              risks: [],
              nextActions: [],
              generatedAt: 1200,
          },
      });

      const queue = createCrawlQueue({
          repository,
          crawl: crawlSpy,
          analyze: customAnalyze,
          profilePath: "/path/to/profile.json",
          resumePath: "/path/to/resume.json",
          now: () => 1200,
      });

      await queue.runJob("job-1");

      expect(crawlSpy).not.toHaveBeenCalled();
      expect(customAnalyze).toHaveBeenCalledWith({
          profilePath: "/path/to/profile.json",
          resumeContent: JSON.stringify({ personalInfo: { fullName: "Jane Doe" } }),
          cleanedText: "Pre-scraped job text",
      });
      expect(repository.getJob("job-1")).toMatchObject({
          crawlStatus: "ready",
          cleanedText: "Pre-scraped job text",
          parsedTitle: "Pre-scraped AI Engineer",
      });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**
  Run command: `pnpm --filter @open-resume/backend test crawl-queue.test.ts`
  Expected: Failing test.

- [ ] **Step 3: Modify crawl queue implementation**
  Update `apps/backend/src/jobs/crawl-queue.ts` inside `runJob(id)`:
  - Check if `job.cleanedText` exists before calling `crawl`.
  - Pass `cleanedText` to `markAnalyzing(id, cleanedText, now())`.
  - Retain `crawledAt` in `markReady` via `currentJob.crawledAt || result?.extractedAt || now()`.
  
  *Note: Make sure to update any mock repository setup or references in `crawl-queue.ts` to accommodate the new signature of `markAnalyzing`.*

- [ ] **Step 4: Run tests to verify they pass**
  Run command: `pnpm --filter @open-resume/backend test crawl-queue.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run command:
  ```bash
  git add apps/backend/src/jobs/crawl-queue.ts apps/backend/src/jobs/crawl-queue.test.ts
  git commit -m "feat(backend): bypass crawl step in runJob if cleanedText is non-empty"
  ```

---

### Task 3: API Route changes and OpenAPI regeneration

**Files:**
- Modify: `apps/backend/src/routes/job-routes.ts`
- Modify: `apps/backend/src/server.test.ts`
- Modify: `apps/backend/openapi.json`

- [ ] **Step 1: Write test for the new endpoint in `server.test.ts`**
  Add a test verifying `POST /jobs/:id/retry-analyze` resets the job state to analyzing, keeps `cleanedText`, and enqueues the job.
  
  ```typescript
  // Add to apps/backend/src/server.test.ts
  // You will find retry-crawl tests around line 180. Add similar for retry-analyze.
  ```

- [ ] **Step 2: Run tests to verify they fail**
  Run command: `pnpm --filter @open-resume/backend test server.test.ts`
  Expected: Failing test (404 on endpoint `/jobs/:id/retry-analyze`).

- [ ] **Step 3: Register `retry-analyze` route**
  In `apps/backend/src/routes/job-routes.ts`, register the POST route `/jobs/:id/retry-analyze`.

- [ ] **Step 4: Run tests to verify they pass**
  Run command: `pnpm --filter @open-resume/backend test server.test.ts`
  Expected: PASS

- [ ] **Step 5: Regenerate and lint OpenAPI Spec**
  Run commands:
  ```bash
  pnpm backend:openapi
  pnpm --filter @open-resume/backend openapi:lint
  ```
  Expected: Schema generates successfully and contains the new endpoint, passing redocly lint checks.

- [ ] **Step 6: Commit**
  Run command:
  ```bash
  git add apps/backend/src/routes/job-routes.ts apps/backend/src/server.test.ts apps/backend/openapi.json
  git commit -m "feat(backend): add retry-analyze endpoint and regenerate OpenAPI spec"
  ```

---

### Task 4: Web Client SDK changes

**Files:**
- Modify: `apps/web/src/lib/local-backend-client.ts`
- Modify: `apps/web/src/lib/local-backend-client.test.ts`

- [ ] **Step 1: Write failing test in `local-backend-client.test.ts`**
  Add `retryBackendJobAnalyze` to testing import list and write a test case mock similar to `retryBackendJobCrawl`.

- [ ] **Step 2: Run tests to verify they fail**
  Run command: `pnpm --filter web test local-backend-client.test.ts`
  Expected: Fail (function not defined).

- [ ] **Step 3: Implement client method**
  In `apps/web/src/lib/local-backend-client.ts`, implement and export `retryBackendJobAnalyze(id)`.

- [ ] **Step 4: Run tests to verify they pass**
  Run command: `pnpm --filter web test local-backend-client.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run command:
  ```bash
  git add apps/web/src/lib/local-backend-client.ts apps/web/src/lib/local-backend-client.test.ts
  git commit -m "feat(web): add retryBackendJobAnalyze helper to client SDK"
  ```

---

### Task 5: UI Card and Tracker updates

**Files:**
- Modify: `apps/web/src/components/jobs/BackendJobCard.tsx`
- Modify: `apps/web/src/components/jobs/BackendJobCard.test.tsx`
- Modify: `apps/web/src/routes/jobs.tsx`

- [ ] **Step 1: Write tests in `BackendJobCard.test.tsx`**
  Update tests to cover:
  1. `failed` crawl status with empty `cleanedText` renders `FAILED (SCRAPE)` and `Retry Scrape` button.
  2. `failed` crawl status with non-empty `cleanedText` renders `FAILED (ANALYSIS)` and both `Retry Scrape` and `Retry AI Analysis` buttons.
  3. Clicking the buttons calls the correct prop callbacks.

- [ ] **Step 2: Run tests to verify they fail**
  Run command: `pnpm --filter web test BackendJobCard.test.ts`
  Expected: Failure (props missing / buttons not rendered / status badge mismatch).

- [ ] **Step 3: Implement UI Card changes**
  Modify `apps/web/src/components/jobs/BackendJobCard.tsx`:
  - Show step-by-step progress feedback for `pending`, `crawling`, and `analyzing` in the description block.
  - Render separate status badges and labels when failed.
  - Render appropriate action buttons.
  
- [ ] **Step 4: Implement Jobs Dashboard changes**
  Modify `apps/web/src/routes/jobs.tsx`:
  - Add `handleRetryAnalyze` callback calling `retryBackendJobAnalyze`.
  - Pass the callback to `BackendJobCard`.

- [ ] **Step 5: Run tests to verify they pass**
  Run command: `pnpm --filter web test BackendJobCard.test.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run command:
  ```bash
  git add apps/web/src/components/jobs/BackendJobCard.tsx apps/web/src/components/jobs/BackendJobCard.test.tsx apps/web/src/routes/jobs.tsx
  git commit -m "feat(web): update job card UI to support separate scrape/analysis retry states"
  ```

---

## Verification Plan

### Automated Tests
Run the entire workspace test suite to verify everything is working and typechecking:
```bash
pnpm verify
```
Expected: All package builds, typecheck, and unit tests pass successfully.

### Manual Verification
1. Run `pnpm dev` to start both the backend server and the Vite app.
2. Add a job URL to crawl.
3. Simulate a crawl failure by disconnecting local internet (renders Scrape failure).
4. Connect internet and retry scrape.
5. Simulate an AI analysis failure by clearing `OPENAI_API_KEY` (or relevant key) in the backend `.env`, then running.
6. Verify card shows `FAILED (ANALYSIS)` with the AI error.
7. Restore key, click **Retry AI Analysis**, and verify it successfully completes and skips crawling.
