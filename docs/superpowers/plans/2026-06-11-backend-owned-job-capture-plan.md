# Backend-Owned Job Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move URL-first job capture, crawl status, cleaned text, and retry/delete lifecycle into the local backend with SQLite-backed persistence.

**Architecture:** The backend becomes the owner of intake jobs and exposes `/jobs` APIs. The web app submits a URL, renders backend-owned pending/ready/failed jobs, and stops blocking job creation on Playwright extraction. Crawling remains generic and stores cleaned text only; AI parsing is explicitly deferred.

**Tech Stack:** Fastify 5, Zod 4, `fastify-type-provider-zod`, Node 22 `node:sqlite`, Playwright, React 19, TanStack Router, Vitest, TypeScript.

`node:sqlite` is available in the local Node runtime and avoids adding a native SQLite dependency. It currently emits Node's experimental SQLite warning; keep that warning acceptable for this local backend unless verification shows TypeScript or runtime incompatibility.

---

## File Structure

- Modify `apps/backend/src/schema.ts`
  - Add `BackendJob`, crawl status, create-job request, route params, and delete response schemas.
- Create `apps/backend/src/jobs/repository.ts`
  - Own SQLite schema initialization and CRUD operations for backend jobs.
- Create `apps/backend/src/jobs/crawl-queue.ts`
  - Own in-process crawl scheduling, status transitions, retry behavior, and stale startup recovery.
- Create `apps/backend/src/jobs/repository.test.ts`
  - Test durable SQLite persistence and row mapping.
- Create `apps/backend/src/jobs/crawl-queue.test.ts`
  - Test crawl success, failure, retry, and deleted-job behavior with mocked crawler.
- Modify `apps/backend/src/extract/playwright.ts`
  - Return generic cleaned text instead of semantic job fields for the new crawl queue.
- Modify `apps/backend/src/extract/playwright.test.ts`
  - Assert generic cleanup output, not company/title/location extraction.
- Modify `apps/backend/src/server.ts`
  - Register `/jobs`, `/jobs/:id`, `/jobs/:id/retry-crawl`, and `DELETE /jobs/:id`.
- Modify `apps/backend/src/server.test.ts`
  - Add route tests for backend-owned jobs and update OpenAPI assertions.
- Modify `apps/backend/src/openapi.test.ts`
  - Assert new job schemas and endpoints are present in generated OpenAPI.
- Regenerate `apps/backend/openapi.json`.
- Modify `apps/web/src/lib/local-backend-client.ts`
  - Replace extract-only client with backend job client functions.
- Modify `apps/web/src/lib/local-backend-client.test.ts`
  - Cover create/list/retry/delete and service-unavailable errors.
- Modify `apps/web/src/components/jobs/NewJobApplicationModal.tsx`
  - Replace full form with URL-only submission.
- Create `apps/web/src/components/jobs/BackendJobCard.tsx`
  - Render pending, ready, and failed backend jobs.
- Modify `apps/web/src/routes/jobs.tsx`
  - Use backend jobs for intake dashboard and polling.
- Modify `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx`
  - Assert the modal submits only a URL to the backend client.
- Create `apps/web/src/components/jobs/BackendJobCard.test.tsx`
  - Assert pending, ready, and failed crawl states render correctly.

## Task 1: Add Backend Job Schemas

**Files:**
- Modify: `apps/backend/src/schema.ts`
- Test: `apps/backend/src/schema.test.ts`

- [ ] **Step 1: Extend schema tests first**

Add tests to `apps/backend/src/schema.test.ts`:

```ts
import {
	backendJobSchema,
	createJobRequestSchema,
	deleteJobResponseSchema,
	jobIdParamsSchema,
} from "./schema.js";

it("accepts a backend job with pending crawl state", () => {
	const parsed = backendJobSchema.parse({
		id: "job-1",
		sourceUrl: "https://example.com/jobs/1",
		crawlStatus: "pending",
		crawlError: null,
		cleanedText: "",
		createdAt: 1791571200000,
		updatedAt: 1791571200000,
		crawledAt: null,
	});

	expect(parsed.crawlStatus).toBe("pending");
});

it("rejects create job requests with non-http URLs", () => {
	expect(() => createJobRequestSchema.parse({ sourceUrl: "file:///tmp/a" }))
		.toThrow(ZodError);
});

it("accepts job route params and delete responses", () => {
	expect(jobIdParamsSchema.parse({ id: "job-1" })).toEqual({ id: "job-1" });
	expect(deleteJobResponseSchema.parse({ deleted: true })).toEqual({
		deleted: true,
	});
});

it("registers job schemas for OpenAPI component generation", () => {
	expect(z.globalRegistry.get(createJobRequestSchema)?.id).toBe(
		"CreateJobRequest",
	);
	expect(z.globalRegistry.get(backendJobSchema)?.id).toBe("BackendJob");
	expect(z.globalRegistry.get(deleteJobResponseSchema)?.id).toBe(
		"DeleteJobResponse",
	);
});
```

- [ ] **Step 2: Run schema tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/schema.test.ts
```

Expected: FAIL because the new schemas are not exported yet.

- [ ] **Step 3: Add the Zod schemas**

Add this to `apps/backend/src/schema.ts` after the existing extraction schemas:

```ts
export const crawlStatusSchema = z.enum([
	"pending",
	"crawling",
	"ready",
	"failed",
]);

export type CrawlStatus = z.infer<typeof crawlStatusSchema>;

export const createJobRequestSchema = z
	.object({
		sourceUrl: httpUrlSchema.describe("HTTP or HTTPS job posting URL to crawl."),
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
		id: z.string(),
		sourceUrl: httpUrlSchema,
		crawlStatus: crawlStatusSchema,
		crawlError: z.string().nullable(),
		cleanedText: z.string(),
		createdAt: z.number().describe("Unix timestamp in milliseconds."),
		updatedAt: z.number().describe("Unix timestamp in milliseconds."),
		crawledAt: z
			.number()
			.nullable()
			.describe("Unix timestamp in milliseconds, or null before crawl success."),
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

z.globalRegistry.add(createJobRequestSchema, { id: "CreateJobRequest" });
z.globalRegistry.add(jobIdParamsSchema, { id: "JobIdParams" });
z.globalRegistry.add(backendJobSchema, { id: "BackendJob" });
z.globalRegistry.add(backendJobsResponseSchema, {
	id: "BackendJobsResponse",
});
z.globalRegistry.add(deleteJobResponseSchema, { id: "DeleteJobResponse" });
```

- [ ] **Step 4: Run schema tests**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/schema.ts apps/backend/src/schema.test.ts
git commit -m "feat(backend): add job intake schemas"
```

## Task 2: Add SQLite Job Repository

**Files:**
- Create: `apps/backend/src/jobs/repository.ts`
- Create: `apps/backend/src/jobs/repository.test.ts`

- [ ] **Step 1: Write repository tests**

Create `apps/backend/src/jobs/repository.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { createJobRepository } from "./repository.js";

describe("job repository", () => {
	const repositories: Array<ReturnType<typeof createJobRepository>> = [];

	afterEach(() => {
		for (const repository of repositories) {
			repository.close();
		}
		repositories.length = 0;
	});

	function createTestRepository() {
		const repository = createJobRepository(":memory:");
		repositories.push(repository);
		return repository;
	}

	it("creates and lists jobs newest first", () => {
		const repository = createTestRepository();

		const first = repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			now: 1000,
		});
		const second = repository.createJob({
			id: "job-2",
			sourceUrl: "https://example.com/two",
			now: 2000,
		});

		expect(first).toMatchObject({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			crawlStatus: "pending",
			cleanedText: "",
		});
		expect(repository.listJobs()).toEqual([second, first]);
	});

	it("updates crawl success and failure state", () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		repository.markCrawling("job-1", 1100);
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "crawling",
			updatedAt: 1100,
		});

		repository.markReady("job-1", {
			cleanedText: "Build useful software.",
			now: 1200,
		});
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawlError: null,
			cleanedText: "Build useful software.",
			updatedAt: 1200,
			crawledAt: 1200,
		});

		repository.markFailed("job-1", {
			error: "Blocked",
			now: 1300,
		});
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError: "Blocked",
			updatedAt: 1300,
		});
	});

	it("resets failed jobs for retry and deletes jobs", () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		repository.markFailed("job-1", { error: "Timeout", now: 1100 });

		const retried = repository.resetForRetry("job-1", 1200);

		expect(retried).toMatchObject({
			crawlStatus: "pending",
			crawlError: null,
			updatedAt: 1200,
		});
		expect(repository.deleteJob("job-1")).toBe(true);
		expect(repository.getJob("job-1")).toBeNull();
		expect(repository.deleteJob("job-1")).toBe(false);
	});
});
```

- [ ] **Step 2: Run repository tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/jobs/repository.test.ts
```

Expected: FAIL because `repository.ts` does not exist.

- [ ] **Step 3: Implement repository**

Create `apps/backend/src/jobs/repository.ts`:

```ts
import { DatabaseSync } from "node:sqlite";
import type { BackendJob, CrawlStatus } from "../schema.js";

interface JobRow {
	id: string;
	source_url: string;
	crawl_status: CrawlStatus;
	crawl_error: string | null;
	cleaned_text: string;
	created_at: number;
	updated_at: number;
	crawled_at: number | null;
}

function mapJob(row: JobRow): BackendJob {
	return {
		id: row.id,
		sourceUrl: row.source_url,
		crawlStatus: row.crawl_status,
		crawlError: row.crawl_error,
		cleanedText: row.cleaned_text,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		crawledAt: row.crawled_at,
	};
}

export function createJobRepository(path: string) {
	const database = new DatabaseSync(path);
	database.exec(`
		create table if not exists jobs (
			id text primary key,
			source_url text not null,
			crawl_status text not null,
			crawl_error text,
			cleaned_text text not null default '',
			created_at integer not null,
			updated_at integer not null,
			crawled_at integer
		);
		create index if not exists jobs_updated_at_idx on jobs(updated_at desc);
	`);

	return {
		createJob(input: { id: string; sourceUrl: string; now: number }) {
			database
				.prepare(`
					insert into jobs (
						id, source_url, crawl_status, crawl_error, cleaned_text,
						created_at, updated_at, crawled_at
					) values (?, ?, 'pending', null, '', ?, ?, null)
				`)
				.run(input.id, input.sourceUrl, input.now, input.now);
			return this.getJob(input.id) as BackendJob;
		},

		listJobs() {
			return database
				.prepare("select * from jobs order by updated_at desc, created_at desc")
				.all()
				.map((row) => mapJob(row as JobRow));
		},

		getJob(id: string) {
			const row = database
				.prepare("select * from jobs where id = ?")
				.get(id) as JobRow | undefined;
			return row ? mapJob(row) : null;
		},

		listRunnableJobs() {
			return database
				.prepare(`
					select * from jobs
					where crawl_status in ('pending', 'crawling')
					order by created_at asc
				`)
				.all()
				.map((row) => mapJob(row as JobRow));
		},

		markCrawling(id: string, now: number) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'crawling', crawl_error = null, updated_at = ?
					where id = ?
				`)
				.run(now, id);
			return this.getJob(id);
		},

		markReady(
			id: string,
			input: { cleanedText: string; now: number },
		) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'ready',
						crawl_error = null,
						cleaned_text = ?,
						updated_at = ?,
						crawled_at = ?
					where id = ?
				`)
				.run(input.cleanedText, input.now, input.now, id);
			return this.getJob(id);
		},

		markFailed(id: string, input: { error: string; now: number }) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'failed', crawl_error = ?, updated_at = ?
					where id = ?
				`)
				.run(input.error, input.now, id);
			return this.getJob(id);
		},

		resetForRetry(id: string, now: number) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'pending', crawl_error = null, updated_at = ?
					where id = ?
				`)
				.run(now, id);
			return this.getJob(id);
		},

		deleteJob(id: string) {
			const result = database.prepare("delete from jobs where id = ?").run(id);
			return result.changes > 0;
		},

		close() {
			database.close();
		},
	};
}

export type JobRepository = ReturnType<typeof createJobRepository>;
```

- [ ] **Step 4: Run repository tests**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/jobs/repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/jobs/repository.ts apps/backend/src/jobs/repository.test.ts
git commit -m "feat(backend): persist intake jobs in sqlite"
```

## Task 3: Convert Playwright Extraction To Generic Cleaned Text

**Files:**
- Modify: `apps/backend/src/extract/playwright.ts`
- Modify: `apps/backend/src/extract/playwright.test.ts`

- [ ] **Step 1: Update Playwright tests**

Replace semantic assertions in `apps/backend/src/extract/playwright.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
	crawlCleanedTextWithPlaywright,
	normalizePlaywrightCrawl,
} from "./playwright.js";

describe("normalizePlaywrightCrawl", () => {
	it("returns cleaned text from rendered html without semantic parsing", () => {
		const result = normalizePlaywrightCrawl({
			sourceUrl: "https://example.com/job",
			html: `
				<html>
					<head><style>.hidden { display: none; }</style></head>
					<body>
						<nav>Site navigation</nav>
						<main><h1>AI Engineer</h1><p>Build hiring tools.</p></main>
						<script>window.analytics = true;</script>
					</body>
				</html>
			`,
		});

		expect(result.sourceUrl).toBe("https://example.com/job");
		expect(result.cleanedText).toContain("AI Engineer");
		expect(result.cleanedText).toContain("Build hiring tools.");
		expect(result.cleanedText).not.toContain("window.analytics");
		expect(result.extractedAt).toEqual(expect.any(Number));
	});
});

describe("crawlCleanedTextWithPlaywright", () => {
	it("extracts cleaned content from both main page and iframes", async () => {
		const iframeContent = `
			<html>
				<body>
					<h2>Inside Iframe</h2>
					<p>Awesome design role.</p>
				</body>
			</html>
		`;
		const mainContent = `
			<html>
				<body>
					<h1>Main Job Title</h1>
					<iframe src="data:text/html;charset=utf-8,${encodeURIComponent(iframeContent)}"></iframe>
				</body>
			</html>
		`;
		const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(mainContent)}`;

		const result = await crawlCleanedTextWithPlaywright(dataUrl);

		expect(result.cleanedText).toContain("Main Job Title");
		expect(result.cleanedText).toContain("Inside Iframe");
		expect(result.cleanedText).toContain("Awesome design role.");
	}, 20000);
});
```

- [ ] **Step 2: Run Playwright tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/extract/playwright.test.ts
```

Expected: FAIL because `crawlCleanedTextWithPlaywright` and `normalizePlaywrightCrawl` are not exported.

- [ ] **Step 3: Implement generic crawl result**

Update `apps/backend/src/extract/playwright.ts` to export:

```ts
import { chromium } from "playwright";
import { extractReadableText } from "./html.js";

interface ExtractionLogger {
	debug(bindings: Record<string, unknown>, message: string): void;
}

interface ExtractionLogOptions {
	logger?: ExtractionLogger;
	logScrapedData?: boolean;
}

export interface CleanedPageCrawlResult {
	sourceUrl: string;
	cleanedText: string;
	extractedAt: number;
}

export function normalizePlaywrightCrawl(input: {
	sourceUrl: string;
	html: string;
	logger?: ExtractionLogger;
	logScrapedData?: boolean;
}): CleanedPageCrawlResult {
	const cleanedText = extractReadableText(input.html).trim();

	if (input.logScrapedData) {
		input.logger?.debug(
			{ url: input.sourceUrl, cleanedText },
			"scraped text after cleanup",
		);
	}

	return {
		sourceUrl: input.sourceUrl,
		cleanedText,
		extractedAt: Date.now(),
	};
}

export async function crawlCleanedTextWithPlaywright(
	sourceUrl: string,
	options: ExtractionLogOptions = {},
): Promise<CleanedPageCrawlResult> {
	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage();
		await page.goto(sourceUrl, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await page
			.waitForLoadState("networkidle", { timeout: 10000 })
			.catch(() => {});
		let html = await page.content();

		for (const frame of page.frames()) {
			if (frame !== page.mainFrame()) {
				try {
					const frameContent = await frame.content();
					html += `\n<!-- FRAME: ${frame.url()} -->\n${frameContent}`;
				} catch {
					// Ignore frames that cannot be read.
				}
			}
		}

		return normalizePlaywrightCrawl({
			sourceUrl,
			html,
			logger: options.logger,
			logScrapedData: options.logScrapedData,
		});
	} finally {
		await browser.close();
	}
}
```

- [ ] **Step 4: Run Playwright tests**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/extract/playwright.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/extract/playwright.ts apps/backend/src/extract/playwright.test.ts
git commit -m "refactor(backend): crawl generic cleaned text"
```

## Task 4: Add Backend Crawl Queue

**Files:**
- Create: `apps/backend/src/jobs/crawl-queue.ts`
- Create: `apps/backend/src/jobs/crawl-queue.test.ts`

- [ ] **Step 1: Write crawl queue tests**

Create `apps/backend/src/jobs/crawl-queue.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCrawlQueue } from "./crawl-queue.js";
import { createJobRepository } from "./repository.js";

describe("crawl queue", () => {
	const repositories: Array<ReturnType<typeof createJobRepository>> = [];

	afterEach(() => {
		for (const repository of repositories) {
			repository.close();
		}
		repositories.length = 0;
		vi.restoreAllMocks();
	});

	function createTestRepository() {
		const repository = createJobRepository(":memory:");
		repositories.push(repository);
		return repository;
	}

	it("marks a job ready when crawling succeeds", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Build useful software.",
				extractedAt: 1200,
			}),
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawlError: null,
			cleanedText: "Build useful software.",
			crawledAt: 1200,
		});
	});

	it("marks a job failed when crawling throws or returns empty text", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => {
				throw new Error("Blocked by site");
			},
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError: "Blocked by site",
		});
	});

	it("does not recreate a deleted job after crawl completion", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => {
				repository.deleteJob("job-1");
				return {
					sourceUrl: "https://example.com/job",
					cleanedText: "Late result",
					extractedAt: 1300,
				};
			},
			now: () => 1300,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toBeNull();
	});
});
```

- [ ] **Step 2: Run crawl queue tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/jobs/crawl-queue.test.ts
```

Expected: FAIL because `crawl-queue.ts` does not exist.

- [ ] **Step 3: Implement crawl queue**

Create `apps/backend/src/jobs/crawl-queue.ts`:

```ts
import type { CleanedPageCrawlResult } from "../extract/playwright.js";
import { crawlCleanedTextWithPlaywright } from "../extract/playwright.js";
import type { JobRepository } from "./repository.js";

interface CrawlQueueOptions {
	repository: JobRepository;
	crawl?: (sourceUrl: string) => Promise<CleanedPageCrawlResult>;
	now?: () => number;
}

export function createCrawlQueue(options: CrawlQueueOptions) {
	const crawl = options.crawl ?? crawlCleanedTextWithPlaywright;
	const now = options.now ?? Date.now;
	const activeJobs = new Set<string>();

	async function runJob(id: string) {
		if (activeJobs.has(id)) return;
		const job = options.repository.getJob(id);
		if (!job || job.crawlStatus === "ready") return;

		activeJobs.add(id);
		options.repository.markCrawling(id, now());

		try {
			const result = await crawl(job.sourceUrl);
			const cleanedText = result.cleanedText.trim();
			if (!cleanedText) {
				throw new Error("Crawl completed but no useful text was found.");
			}
			if (options.repository.getJob(id)) {
				options.repository.markReady(id, {
					cleanedText,
					now: result.extractedAt,
				});
			}
		} catch (error) {
			if (options.repository.getJob(id)) {
				options.repository.markFailed(id, {
					error: error instanceof Error ? error.message : String(error),
					now: now(),
				});
			}
		} finally {
			activeJobs.delete(id);
		}
	}

	function enqueue(id: string) {
		void runJob(id);
	}

	function enqueueRunnableJobs() {
		for (const job of options.repository.listRunnableJobs()) {
			enqueue(job.id);
		}
	}

	return {
		runJob,
		enqueue,
		enqueueRunnableJobs,
	};
}

export type CrawlQueue = ReturnType<typeof createCrawlQueue>;
```

- [ ] **Step 4: Run crawl queue tests**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/jobs/crawl-queue.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/jobs/crawl-queue.ts apps/backend/src/jobs/crawl-queue.test.ts
git commit -m "feat(backend): add job crawl queue"
```

## Task 5: Add Backend Job Routes

**Files:**
- Modify: `apps/backend/src/server.ts`
- Modify: `apps/backend/src/server.test.ts`

- [ ] **Step 1: Update server tests**

Add route tests to `apps/backend/src/server.test.ts` using `createServer({ jobRepository, crawlQueue })`:

```ts
import { createCrawlQueue } from "./jobs/crawl-queue.js";
import { createJobRepository } from "./jobs/repository.js";

it("creates backend jobs immediately without waiting for crawl completion", async () => {
	const repository = createJobRepository(":memory:");
	const crawlQueue = createCrawlQueue({
		repository,
		crawl: async () => ({
			sourceUrl: "https://example.com/job",
			cleanedText: "Build useful software.",
			extractedAt: 1200,
		}),
		now: () => 1000,
	});
	vi.spyOn(crawlQueue, "enqueue");
	const server = createServer({ jobRepository: repository, crawlQueue });

	const response = await server.inject({
		method: "POST",
		url: "/jobs",
		payload: { sourceUrl: "https://example.com/job" },
	});

	expect(response.statusCode).toBe(201);
	expect(response.json()).toMatchObject({
		sourceUrl: "https://example.com/job",
		crawlStatus: "pending",
		cleanedText: "",
	});
	expect(crawlQueue.enqueue).toHaveBeenCalledWith(response.json().id);
	repository.close();
});

it("lists, retries, gets, and deletes backend jobs", async () => {
	const repository = createJobRepository(":memory:");
	const crawlQueue = createCrawlQueue({
		repository,
		crawl: async () => ({
			sourceUrl: "https://example.com/job",
			cleanedText: "Build useful software.",
			extractedAt: 1200,
		}),
		now: () => 1000,
	});
	vi.spyOn(crawlQueue, "enqueue");
	const created = repository.createJob({
		id: "job-1",
		sourceUrl: "https://example.com/job",
		now: 1000,
	});
	repository.markFailed(created.id, { error: "Timeout", now: 1100 });
	const server = createServer({ jobRepository: repository, crawlQueue });

	expect(
		(
			await server.inject({
				method: "GET",
				url: "/jobs",
			})
		).json(),
	).toMatchObject({ jobs: [expect.objectContaining({ id: "job-1" })] });

	expect(
		(
			await server.inject({
				method: "POST",
				url: "/jobs/job-1/retry-crawl",
			})
		).json(),
	).toMatchObject({ id: "job-1", crawlStatus: "pending" });
	expect(crawlQueue.enqueue).toHaveBeenCalledWith("job-1");

	expect(
		(
			await server.inject({
				method: "GET",
				url: "/jobs/job-1",
			})
		).json(),
	).toMatchObject({ id: "job-1" });

	const deleteResponse = await server.inject({
		method: "DELETE",
		url: "/jobs/job-1",
	});
	expect(deleteResponse.statusCode).toBe(200);
	expect(deleteResponse.json()).toEqual({ deleted: true });
	repository.close();
});
```

- [ ] **Step 2: Run server tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/server.test.ts
```

Expected: FAIL because `createServer` does not accept repository/queue options and `/jobs` routes do not exist.

- [ ] **Step 3: Modify `createServer` options and register job routes**

In `apps/backend/src/server.ts`, extend imports and options:

```ts
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { crawlCleanedTextWithPlaywright } from "./extract/playwright.js";
import { createCrawlQueue, type CrawlQueue } from "./jobs/crawl-queue.js";
import {
	createJobRepository,
	type JobRepository,
} from "./jobs/repository.js";
import {
	backendJobSchema,
	backendJobsResponseSchema,
	createJobRequestSchema,
	deleteJobResponseSchema,
	jobIdParamsSchema,
} from "./schema.js";
```

Add to `CreateServerOptions`:

```ts
jobRepository?: JobRepository;
crawlQueue?: CrawlQueue;
databasePath?: string;
```

Create repository/queue before route registration:

```ts
const databasePath =
	options.databasePath ??
	process.env.OPEN_RESUME_BACKEND_DB_PATH ??
	resolve(process.cwd(), ".open-resume-backend/jobs.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });
const jobRepository =
	options.jobRepository ?? createJobRepository(databasePath);
const crawlQueue =
	options.crawlQueue ??
	createCrawlQueue({
		repository: jobRepository,
		crawl: (sourceUrl) =>
			crawlCleanedTextWithPlaywright(sourceUrl, {
				logScrapedData,
			}),
	});
```

Register routes inside `server.after(() => { ... })`:

```ts
typedServer.post(
	"/jobs",
	{
		schema: {
			operationId: "createJob",
			tags: ["Jobs"],
			summary: "Create a local job intake record and enqueue crawling",
			body: createJobRequestSchema,
			response: {
				201: backendJobSchema,
				400: backendErrorResponseSchema,
				500: backendErrorResponseSchema,
			},
		},
	},
	async (request, reply) => {
		const id =
			globalThis.crypto?.randomUUID?.() ??
			`job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const job = jobRepository.createJob({
			id,
			sourceUrl: request.body.sourceUrl,
			now: Date.now(),
		});
		crawlQueue.enqueue(job.id);
		return reply.status(201).send(job);
	},
);

typedServer.get(
	"/jobs",
	{
		schema: {
			operationId: "listJobs",
			tags: ["Jobs"],
			summary: "List local backend jobs",
			response: {
				200: backendJobsResponseSchema,
			},
		},
	},
	async () => ({ jobs: jobRepository.listJobs() }),
);

typedServer.get(
	"/jobs/:id",
	{
		schema: {
			operationId: "getJob",
			tags: ["Jobs"],
			summary: "Get one local backend job",
			params: jobIdParamsSchema,
			response: {
				200: backendJobSchema,
				404: backendErrorResponseSchema,
			},
		},
	},
	async (request, reply) => {
		const job = jobRepository.getJob(request.params.id);
		if (!job) return reply.status(404).send({ error: "Job not found" });
		return job;
	},
);

typedServer.post(
	"/jobs/:id/retry-crawl",
	{
		schema: {
			operationId: "retryJobCrawl",
			tags: ["Jobs"],
			summary: "Retry crawling a failed or pending local backend job",
			params: jobIdParamsSchema,
			response: {
				200: backendJobSchema,
				404: backendErrorResponseSchema,
			},
		},
	},
	async (request, reply) => {
		const job = jobRepository.resetForRetry(request.params.id, Date.now());
		if (!job) return reply.status(404).send({ error: "Job not found" });
		crawlQueue.enqueue(job.id);
		return job;
	},
);

typedServer.delete(
	"/jobs/:id",
	{
		schema: {
			operationId: "deleteJob",
			tags: ["Jobs"],
			summary: "Delete a local backend job",
			params: jobIdParamsSchema,
			response: {
				200: deleteJobResponseSchema,
			},
		},
	},
	async (request) => ({
		deleted: jobRepository.deleteJob(request.params.id),
	}),
);
```

Add `Jobs` to the OpenAPI tag list in `openapi.ts`.

- [ ] **Step 4: Run server tests**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/server.ts apps/backend/src/server.test.ts apps/backend/src/openapi.ts
git commit -m "feat(backend): add job intake routes"
```

## Task 6: Update OpenAPI Contract

**Files:**
- Modify: `apps/backend/src/openapi.test.ts`
- Modify: `apps/backend/openapi.json`

- [ ] **Step 1: Extend OpenAPI tests**

Update required schemas in `apps/backend/src/openapi.test.ts` to include:

```ts
"CreateJobRequest",
"JobIdParams",
"BackendJob",
"BackendJobsResponse",
"DeleteJobResponse",
```

Add required operations:

```ts
{
	path: "/jobs",
	method: "post",
	operationId: "createJob",
	tags: ["Jobs"],
	responses: ["201", "400", "500"],
},
{
	path: "/jobs",
	method: "get",
	operationId: "listJobs",
	tags: ["Jobs"],
	responses: ["200"],
},
{
	path: "/jobs/{id}",
	method: "get",
	operationId: "getJob",
	tags: ["Jobs"],
	responses: ["200", "404"],
},
{
	path: "/jobs/{id}/retry-crawl",
	method: "post",
	operationId: "retryJobCrawl",
	tags: ["Jobs"],
	responses: ["200", "404"],
},
{
	path: "/jobs/{id}",
	method: "delete",
	operationId: "deleteJob",
	tags: ["Jobs"],
	responses: ["200"],
},
```

- [ ] **Step 2: Run OpenAPI tests and verify failure if JSON is stale**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/openapi.test.ts
```

Expected: FAIL until `apps/backend/openapi.json` is regenerated.

- [ ] **Step 3: Regenerate OpenAPI**

Run:

```bash
pnpm backend:openapi
```

Expected: `apps/backend/openapi.json` updates with `/jobs` paths and new schemas.

- [ ] **Step 4: Run OpenAPI tests and lint**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/openapi.test.ts
pnpm --filter @open-resume/backend openapi:lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/openapi.test.ts apps/backend/openapi.json
git commit -m "test(backend): cover job intake openapi contract"
```

## Task 7: Replace Web Backend Client

**Files:**
- Modify: `apps/web/src/lib/local-backend-client.ts`
- Modify: `apps/web/src/lib/local-backend-client.test.ts`

- [ ] **Step 1: Replace client tests**

Update `apps/web/src/lib/local-backend-client.test.ts` to cover:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createBackendJob,
	deleteBackendJob,
	listBackendJobs,
	retryBackendJobCrawl,
} from "./local-backend-client";

describe("local backend client", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("creates a backend job", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					id: "job-1",
					sourceUrl: "https://example.com/job",
					crawlStatus: "pending",
					crawlError: null,
					cleanedText: "",
					createdAt: 1791571200000,
					updatedAt: 1791571200000,
					crawledAt: null,
				}),
			})),
		);

		const result = await createBackendJob("https://example.com/job");

		expect(result).toMatchObject({
			id: "job-1",
			crawlStatus: "pending",
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/jobs",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("lists backend jobs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ jobs: [] }),
			})),
		);

		await expect(listBackendJobs()).resolves.toEqual([]);
	});

	it("retries and deletes backend jobs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					id: "job-1",
					sourceUrl: "https://example.com/job",
					crawlStatus: "pending",
					crawlError: null,
					cleanedText: "",
					createdAt: 1,
					updatedAt: 2,
					crawledAt: null,
				}),
			})),
		);

		await expect(retryBackendJobCrawl("job-1")).resolves.toMatchObject({
			id: "job-1",
		});
		await expect(deleteBackendJob("job-1")).resolves.toEqual({
			deleted: true,
		});
	});

	it("returns a user-facing error when the backend is unavailable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);

		await expect(listBackendJobs()).rejects.toThrow(
			"Local backend is not reachable",
		);
	});
});
```

- [ ] **Step 2: Run client tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/web test -- src/lib/local-backend-client.test.ts
```

Expected: FAIL because the new functions do not exist.

- [ ] **Step 3: Implement backend job client**

Replace `apps/web/src/lib/local-backend-client.ts` with:

```ts
import { z } from "zod";

const backendBaseUrl = "http://127.0.0.1:47321";

const backendJobSchema = z.object({
	id: z.string(),
	sourceUrl: z.string().url(),
	crawlStatus: z.enum(["pending", "crawling", "ready", "failed"]),
	crawlError: z.string().nullable(),
	cleanedText: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	crawledAt: z.number().nullable(),
});

const backendJobsResponseSchema = z.object({
	jobs: z.array(backendJobSchema),
});

const deleteJobResponseSchema = z.object({
	deleted: z.boolean(),
});

export type LocalBackendJob = z.infer<typeof backendJobSchema>;

async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
	try {
		return await fetch(`${backendBaseUrl}${path}`, init);
	} catch {
		throw new Error(
			"Local backend is not reachable. Start it with pnpm backend:dev.",
		);
	}
}

async function parseBackendResponse<T>(
	response: Response,
	schema: z.ZodType<T>,
	fallbackMessage: string,
): Promise<T> {
	if (!response.ok) {
		throw new Error(fallbackMessage);
	}
	return schema.parse(await response.json());
}

export async function createBackendJob(
	sourceUrl: string,
): Promise<LocalBackendJob> {
	const response = await backendFetch("/jobs", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ sourceUrl }),
	});
	return parseBackendResponse(
		response,
		backendJobSchema,
		"Local backend could not create this job.",
	);
}

export async function listBackendJobs(): Promise<LocalBackendJob[]> {
	const response = await backendFetch("/jobs");
	const parsed = await parseBackendResponse(
		response,
		backendJobsResponseSchema,
		"Local backend could not list jobs.",
	);
	return parsed.jobs;
}

export async function retryBackendJobCrawl(
	id: string,
): Promise<LocalBackendJob> {
	const response = await backendFetch(`/jobs/${id}/retry-crawl`, {
		method: "POST",
	});
	return parseBackendResponse(
		response,
		backendJobSchema,
		"Local backend could not retry this crawl.",
	);
}

export async function deleteBackendJob(
	id: string,
): Promise<{ deleted: boolean }> {
	const response = await backendFetch(`/jobs/${id}`, {
		method: "DELETE",
	});
	return parseBackendResponse(
		response,
		deleteJobResponseSchema,
		"Local backend could not delete this job.",
	);
}
```

- [ ] **Step 4: Run client tests**

Run:

```bash
pnpm --filter @open-resume/web test -- src/lib/local-backend-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/local-backend-client.ts apps/web/src/lib/local-backend-client.test.ts
git commit -m "feat(web): add backend job client"
```

## Task 8: Simplify New Job Modal

**Files:**
- Modify: `apps/web/src/components/jobs/NewJobApplicationModal.tsx`
- Modify: `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx`

- [ ] **Step 1: Update modal tests**

Modify `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx` to assert:

```ts
it("submits only a URL to the local backend", async () => {
	const createBackendJob = vi.mocked(localBackend.createBackendJob);
	createBackendJob.mockResolvedValue({
		id: "job-1",
		sourceUrl: "https://example.com/job",
		crawlStatus: "pending",
		crawlError: null,
		cleanedText: "",
		createdAt: 1,
		updatedAt: 1,
		crawledAt: null,
	});

	render(<NewJobApplicationModal onClose={onClose} onCreated={onCreated} />);

	await userEvent.type(screen.getByLabelText(/job url/i), "https://example.com/job");
	await userEvent.click(screen.getByRole("button", { name: /add job/i }));

	expect(createBackendJob).toHaveBeenCalledWith("https://example.com/job");
	expect(onCreated).toHaveBeenCalled();
	expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run modal tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/web test -- src/components/jobs/NewJobApplicationModal.test.tsx
```

Expected: FAIL because the modal still uses the old form fields and store.

- [ ] **Step 3: Replace modal implementation**

Update `apps/web/src/components/jobs/NewJobApplicationModal.tsx` to:

```tsx
import { type FormEvent, useState } from "react";
import { createBackendJob } from "#/lib/local-backend-client";

interface NewJobApplicationModalProps {
	onClose: () => void;
	onCreated?: () => void;
}

function isValidHttpUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export default function NewJobApplicationModal({
	onClose,
	onCreated,
}: NewJobApplicationModalProps) {
	const [sourceUrl, setSourceUrl] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedUrl = sourceUrl.trim();
		if (!isValidHttpUrl(trimmedUrl)) {
			setError("Enter a valid HTTP or HTTPS job URL.");
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			await createBackendJob(trimmedUrl);
			onCreated?.();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add job.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="flex w-full max-w-xl flex-col gap-4 rounded-base border-2 border-border bg-white p-6 text-[#082F49] shadow-shadow">
				<h2 className="font-heading text-2xl">Add Job URL</h2>
				{error && (
					<div className="rounded-base border-2 border-border bg-red-100 p-2 font-bold text-red-900 text-sm">
						{error}
					</div>
				)}
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div>
						<label className="mb-1 block font-bold text-sm" htmlFor="job-url">
							Job URL
						</label>
						<input
							id="job-url"
							type="url"
							required
							value={sourceUrl}
							onChange={(event) => setSourceUrl(event.target.value)}
							placeholder="https://company.com/careers/job"
							className="w-full rounded-base border-2 border-border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-main"
						/>
					</div>
					<div className="mt-2 flex justify-end gap-4">
						<button
							type="button"
							onClick={onClose}
							className="cursor-pointer rounded-base border-2 border-border bg-white px-4 py-2 font-bold hover:bg-main/5"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="cursor-pointer rounded-base border-2 border-border bg-main px-4 py-2 font-bold text-main-foreground shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none disabled:opacity-60"
						>
							{isSubmitting ? "Adding..." : "Add Job"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
```

- [ ] **Step 4: Run modal tests**

Run:

```bash
pnpm --filter @open-resume/web test -- src/components/jobs/NewJobApplicationModal.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/jobs/NewJobApplicationModal.tsx apps/web/src/components/jobs/NewJobApplicationModal.test.tsx
git commit -m "feat(web): simplify job creation to url capture"
```

## Task 9: Add Backend Job Dashboard Cards

**Files:**
- Create: `apps/web/src/components/jobs/BackendJobCard.tsx`
- Create: `apps/web/src/components/jobs/BackendJobCard.test.tsx`
- Modify: `apps/web/src/routes/jobs.tsx`

- [ ] **Step 1: Write card tests**

Create `apps/web/src/components/jobs/BackendJobCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BackendJobCard from "./BackendJobCard";

const baseJob = {
	id: "job-1",
	sourceUrl: "https://example.com/jobs/1",
	crawlStatus: "pending" as const,
	crawlError: null,
	cleanedText: "",
	createdAt: 1791571200000,
	updatedAt: 1791571200000,
	crawledAt: null,
};

describe("BackendJobCard", () => {
	it("renders pending jobs without company or title", () => {
		render(
			<BackendJobCard
				job={baseJob}
				onRetry={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(screen.getByText("example.com")).toBeInTheDocument();
		expect(screen.getByText(/pending/i)).toBeInTheDocument();
	});

	it("renders ready text previews", () => {
		render(
			<BackendJobCard
				job={{
					...baseJob,
					crawlStatus: "ready",
					cleanedText: "This is a useful job description for an AI engineer.",
					crawledAt: 1791571300000,
				}}
				onRetry={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(screen.getByText(/useful job description/i)).toBeInTheDocument();
	});

	it("renders failed crawl retry action", () => {
		render(
			<BackendJobCard
				job={{
					...baseJob,
					crawlStatus: "failed",
					crawlError: "Blocked by site",
				}}
				onRetry={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(screen.getByText("Blocked by site")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run card tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/web test -- src/components/jobs/BackendJobCard.test.tsx
```

Expected: FAIL because the card component does not exist.

- [ ] **Step 3: Implement card**

Create `apps/web/src/components/jobs/BackendJobCard.tsx`:

```tsx
import { RotateCcw, Trash2 } from "lucide-react";
import type { LocalBackendJob } from "#/lib/local-backend-client";

interface BackendJobCardProps {
	job: LocalBackendJob;
	onRetry: (id: string) => void;
	onDelete: (id: string) => void;
}

function getHostname(sourceUrl: string) {
	try {
		return new URL(sourceUrl).hostname;
	} catch {
		return sourceUrl;
	}
}

function getPreview(text: string) {
	return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

export default function BackendJobCard({
	job,
	onRetry,
	onDelete,
}: BackendJobCardProps) {
	return (
		<article className="flex min-h-52 flex-col gap-3 rounded-base border-2 border-border bg-white p-4 shadow-shadow">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="break-all font-heading text-lg">
						{getHostname(job.sourceUrl)}
					</h3>
					<p className="break-all text-muted-foreground text-xs">
						{job.sourceUrl}
					</p>
				</div>
				<span className="rounded-base border-2 border-border bg-[#F0F9FF] px-2 py-1 font-bold text-xs uppercase">
					{job.crawlStatus}
				</span>
			</div>

			{job.crawlStatus === "ready" && (
				<p className="line-clamp-4 text-sm">{getPreview(job.cleanedText)}</p>
			)}

			{job.crawlStatus === "failed" && (
				<p className="rounded-base border-2 border-border bg-red-100 p-2 text-red-900 text-sm">
					{job.crawlError ?? "Crawl failed."}
				</p>
			)}

			{(job.crawlStatus === "pending" || job.crawlStatus === "crawling") && (
				<p className="text-muted-foreground text-sm">
					Crawl is queued locally. This card will update when the backend
					finishes.
				</p>
			)}

			<div className="mt-auto flex justify-end gap-2">
				{job.crawlStatus === "failed" && (
					<button
						type="button"
						onClick={() => onRetry(job.id)}
						className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm"
					>
						<RotateCcw className="size-4" />
						Retry
					</button>
				)}
				<button
					type="button"
					onClick={() => onDelete(job.id)}
					className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm"
					aria-label="Delete job"
				>
					<Trash2 className="size-4" />
				</button>
			</div>
		</article>
	);
}
```

- [ ] **Step 4: Run card tests**

Run:

```bash
pnpm --filter @open-resume/web test -- src/components/jobs/BackendJobCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Wire dashboard to backend jobs**

In `apps/web/src/routes/jobs.tsx`, fetch jobs with `listBackendJobs`, poll every 2 seconds while mounted, group by status, and render `BackendJobCard`. Keep the old local `JobApplicationCard` import out of the first screen.

Use this state shape:

```ts
const [backendJobs, setBackendJobs] = useState<LocalBackendJob[]>([]);
const [loadError, setLoadError] = useState("");
```

Use this grouping:

```ts
const pendingJobs = backendJobs.filter((job) =>
	["pending", "crawling"].includes(job.crawlStatus),
);
const readyJobs = backendJobs.filter((job) => job.crawlStatus === "ready");
const failedJobs = backendJobs.filter((job) => job.crawlStatus === "failed");
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm --filter @open-resume/web typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/jobs/BackendJobCard.tsx apps/web/src/components/jobs/BackendJobCard.test.tsx apps/web/src/routes/jobs.tsx
git commit -m "feat(web): show backend job intake queue"
```

## Task 10: Full Verification

**Files:**
- No source files.

- [ ] **Step 1: Run backend tests**

Run:

```bash
pnpm --filter @open-resume/backend test
```

Expected: PASS.

- [ ] **Step 2: Run web tests**

Run:

```bash
pnpm --filter @open-resume/web test
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```bash
pnpm verify
```

Expected: PASS.

- [ ] **Step 6: Manual smoke test**

Run:

```bash
pnpm dev
```

Then open `http://localhost:3000/jobs` and verify:

- adding `https://example.com` creates a job immediately
- the job appears in Pending Jobs
- the backend eventually moves it to Ready or Failed
- failed jobs can be retried
- jobs can be deleted
- refreshing the browser does not delete backend jobs

- [ ] **Step 7: Commit verification fixes if any files changed**

If verification required fixes, inspect the changed files:

```bash
git status --short
```

Then commit the specific files that changed. For example, if the only fix was in the backend server:

```bash
git add apps/backend/src/server.ts apps/backend/src/server.test.ts
git commit -m "fix: stabilize backend job capture"
```

Expected: no uncommitted implementation changes remain.
