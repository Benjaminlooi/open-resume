# Companion-Owned Job Capture Design

## Purpose

Simplify the job tracker so creating a job is instant and URL-first. The user should paste a job posting URL, see the job appear immediately, and let the local companion crawl and clean the page in the background. The first version stores cleaned page text as the source of truth. It does not infer company, title, location, seniority, fit, or suitability; those interpretation steps belong to a later AI workflow inspired by Career-Ops.

## Product Direction

The current job creation flow asks for company, title, location, URL, and description. That is too form-heavy for the next direction. The job tracker should behave more like a local intake queue:

1. User pastes a URL.
2. The job is saved immediately.
3. The companion crawls the page outside the browser flow.
4. The dashboard shows pending, ready, and failed jobs.
5. Later AI analysis turns cleaned text into structured job details and suitability artifacts.

This keeps the user moving and creates a cleaner boundary between crawling, storage, and interpretation.

## Architecture

Move job capture, crawl status, and cleaned text storage into the local companion. The web app becomes a client of the companion instead of the owner of the job queue.

The companion will own:

- local job records
- crawl queue state
- crawl execution
- cleaned text persistence
- retry state and errors

The web app will own:

- URL submission UI
- dashboard rendering
- polling or refresh of companion-owned jobs
- later AI workflow surfaces

The first durable storage should be SQLite inside the companion. SQLite is enough for local-first durability without adding accounts, cloud sync, or hosted infrastructure. It lets jobs survive browser refreshes, tab closes, and different browsers while keeping sensitive career data local.

## Database Model

Create a minimal `jobs` table:

```sql
create table jobs (
	id text primary key,
	source_url text not null,
	crawl_status text not null,
	crawl_error text,
	cleaned_text text not null default '',
	created_at integer not null,
	updated_at integer not null,
	crawled_at integer
);
```

Valid `crawl_status` values:

- `pending`: job was created and is waiting for crawl work
- `crawling`: companion is actively crawling the URL
- `ready`: cleaned text is stored and ready for AI analysis
- `failed`: crawl failed and `crawl_error` explains why

Do not store AI-derived company, title, location, fit, or suitability in this table. Those belong in a later analysis table or artifact model.

## Companion API

Add companion-owned job endpoints:

- `POST /jobs`
  - Request: `{ "sourceUrl": "https://example.com/job" }`
  - Response: the created job with `crawlStatus: "pending"` or `"crawling"`
  - Behavior: validate the URL, insert a job row immediately, enqueue crawl work, and return without waiting for crawl completion.

- `GET /jobs`
  - Response: list of companion-owned jobs, newest first.

- `GET /jobs/:id`
  - Response: one job record, including cleaned text when ready.

- `POST /jobs/:id/retry-crawl`
  - Behavior: clear crawl error, set status back to `pending`, and enqueue crawl work again.

- `DELETE /jobs/:id`
  - Behavior: delete the local job record. If a crawl is currently running, its eventual result must not recreate the deleted job.

The existing `/extract-job` endpoint can be kept temporarily for compatibility, but the new frontend should use `/jobs`. A later cleanup can remove or rename `/extract-job` after the job queue flow is stable.

## Crawl And Cleanup

The crawler should remain generic:

- Use Playwright to load the URL.
- Capture the rendered document content.
- Extract readable text with generic cleanup.
- Remove useless HTML effects such as scripts, styles, noscript content, markup, excessive whitespace, and repeated boilerplate when the generic extractor can do so.
- Do not add hardcoded site-specific selectors or rules for individual job boards.

The output source of truth is cleaned text:

```ts
interface CompanionJob {
	id: string;
	sourceUrl: string;
	crawlStatus: "pending" | "crawling" | "ready" | "failed";
	crawlError: string | null;
	cleanedText: string;
	createdAt: number;
	updatedAt: number;
	crawledAt: number | null;
}
```

If the crawler cannot produce useful text, mark the job `failed` with an actionable error. Do not fabricate job details.

The first queue can be in-process inside the companion: `POST /jobs` inserts a durable row, then schedules crawl work without waiting for it. On companion startup, any `pending` or stale `crawling` rows should be eligible to run again. This avoids a separate worker framework while keeping the database as the durable source of truth.

## Frontend UX

Replace the full new job form with a URL-only modal:

- one URL input
- submit button
- inline invalid URL error
- companion connectivity error when the local service is unavailable

On submit:

1. Call `POST /jobs`.
2. Close the modal once the companion creates the job.
3. Show the new job immediately in the pending list.
4. Continue polling `GET /jobs` so the card updates when crawl status changes.

The dashboard should prioritize crawl state:

- **Pending Jobs** for `pending` and `crawling`
- **Ready for Analysis** for `ready` jobs with no AI analysis yet
- **Failed Crawls** for `failed` jobs with retry and delete actions
- Existing application status views can remain secondary until AI analysis and application tracking are reconnected.

Pending cards should show the URL hostname, crawl status, created time, and delete action. Ready cards should show the hostname, crawled time, and a short cleaned text preview. Failed cards should show the hostname, error, retry action, and delete action.

## Existing Web Store Transition

The current web `job-application-store` can remain for resume tailoring and later AI artifacts, but URL capture should stop creating full local job application records directly.

For the first implementation slice:

- Add a companion client for `POST /jobs`, `GET /jobs`, and retry.
- Add companion client support for deleting intake jobs.
- Add a companion-backed dashboard view for intake jobs.
- Stop requiring company and title during URL capture.
- Keep existing job application routes/components available while the analysis bridge is not built.

Later, when AI analysis is added, a ready companion job can become or hydrate a full application workspace. That bridge should be explicit and reviewable.

## Error Handling

Handle these cases distinctly:

- invalid URL before submission
- companion service unavailable
- companion database write failure
- crawl timeout or blocked page
- crawl completes but cleaned text is empty

Failed crawls must stay visible and retryable. The system should never silently delete failed jobs or overwrite cleaned text with empty content.

## Testing

Companion tests:

- URL validation rejects non-HTTP URLs.
- `POST /jobs` creates a pending job immediately.
- `GET /jobs` returns persisted jobs from SQLite.
- crawl success updates `crawl_status`, `cleaned_text`, and `crawled_at`.
- crawl failure stores `crawl_error` and keeps the job visible.
- retry moves a failed job back to `pending`.

Frontend tests:

- URL-only modal submits to the companion client.
- pending jobs render without company or title.
- ready jobs render cleaned text previews.
- failed jobs expose retry.
- companion unavailable produces a clear error.

## Out Of Scope

- AI suitability analysis
- company/title/location parsing
- hardcoded site-specific crawling rules
- hosted database or account model
- cross-device sync
- browser extension capture
- automated application submission

## Acceptance Criteria

- A user can paste a job URL and the job appears immediately.
- The crawl continues under companion ownership instead of a blocking modal request.
- Jobs persist outside browser localStorage.
- Pending, ready, and failed crawl states are visible.
- Cleaned text is stored as the source of truth.
- Company, title, location, and suitability remain unparsed until the later AI analysis workflow.
