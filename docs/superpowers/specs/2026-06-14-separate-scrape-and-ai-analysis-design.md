# Design: Separating Scrape Flow and AI Analysis Flow

This document details the design to separate the job scraping/crawling phase from the AI analysis phase in the companion app. This enables retrying AI analysis directly without repeating the scraping step if the crawl succeeded but the AI analysis failed.

## Objectives
- Persist the scraped `cleanedText` as soon as crawling successfully finishes.
- Recover/resume jobs that were interrupted in the `analyzing` state.
- Expose a new route `/jobs/:id/retry-analyze` to retry only the AI analysis.
- Expose a "Retry AI Analysis" button in the frontend when a job's AI analysis fails but its crawled text is preserved.

---

## 1. DB & Repository Updates (`apps/companion/src/jobs/repository.ts`)

### Changes to JobRepository:
- **`markAnalyzing(id, cleanedText, now)`**: Update to accept `cleanedText` and persist it to the SQLite database.
- **`resetForRetry(id, now)`**: Update to clear `cleaned_text` to `""` (forces a re-crawl when retrying the full process).
- **`resetForAnalysisRetry(id, now)`**: New method to set status to `'analyzing'` and clear `crawl_error`, preserving the existing `cleaned_text`.
- **`listRunnableJobs()`**: Update the SQL query to include jobs with status `'analyzing'`. This ensures that on-startup recovery picks up both `'pending'`, `'crawling'`, and `'analyzing'` jobs.

---

## 2. Crawl Queue & Background Worker (`apps/companion/src/jobs/crawl-queue.ts`)

### Flow inside `runJob(id)`:
1. Fetch the job details. If status is `ready`, return.
2. Check `job.cleanedText`.
   - If `job.cleanedText` is empty (`""`):
     - Transition status to `crawling`.
     - Execute `crawl(job.sourceUrl)`.
     - If scraping fails, transition to `failed`.
     - Otherwise, set `cleanedText` to the scraped text.
   - If `job.cleanedText` is non-empty (skipped crawl):
     - Proceed directly to AI analysis.
3. Transition status to `analyzing` (using `markAnalyzing(id, cleanedText, now)`).
4. Run `analyze` using the preserved `cleanedText`.
5. If AI analysis succeeds:
   - Call `markReady` and retain the original crawl timestamp (`crawledAt` or `result.extractedAt`).
6. If AI analysis fails:
   - Set status to `failed` and record the error, leaving `cleanedText` intact.

---

## 3. Fastify Backend Routing (`apps/companion/src/routes/job-routes.ts`)

- Register a new POST route `/jobs/:id/retry-analyze`.
- The route will:
  1. Call `repository.resetForAnalysisRetry(id, Date.now())`.
  2. If the job exists, call `crawlQueue.enqueue(id)`.
  3. Return the updated job model.

---

## 4. Frontend Client and UI (`apps/web`)

### Client API (`apps/web/src/lib/local-companion-client.ts`)
- Add `retryCompanionJobAnalyze(id)` wrapper calling the POST `/jobs/:id/retry-analyze` route.

### Job Card Component (`apps/web/src/components/jobs/CompanionJobCard.tsx`)
- Props: Add `onRetryAnalyze: (id: string) => void`.
- Status Badge rendering:
  - If `job.crawlStatus === "failed"`:
    - If `job.cleanedText` is non-empty, render the badge as: `FAILED (ANALYSIS)`
    - If `job.cleanedText` is empty, render the badge as: `FAILED (SCRAPE)`
  - Otherwise, render `job.crawlStatus` in uppercase.
- Description / In-Progress message rendering:
  - If `job.crawlStatus === "pending"`: "Job added to queue. Scrape is pending..."
  - If `job.crawlStatus === "crawling"`: "Scraping job description from URL..."
  - If `job.crawlStatus === "analyzing"`: "Scraping succeeded. Analyzing job description with AI..."
- Error Message rendering:
  - If `job.crawlStatus === "failed"`:
    - If `job.cleanedText` is non-empty, render error text as: `AI Analysis failed: {job.crawlError}`
    - If `job.cleanedText` is empty, render error text as: `Scrape failed: {job.crawlError}`
- Render logic for action buttons:
  - Keep **Retry Scrape** button (calls `onRetry`).
  - If `job.cleanedText` is non-empty, render a second button: **Retry AI Analysis** (calls `onRetryAnalyze`).

### Job Tracker Page (`apps/web/src/routes/jobs.tsx`)
- Implement `handleRetryAnalyze` callback which invokes `retryCompanionJobAnalyze` and updates state.
- Pass `onRetryAnalyze={handleRetryAnalyze}` to `CompanionJobCard`.
