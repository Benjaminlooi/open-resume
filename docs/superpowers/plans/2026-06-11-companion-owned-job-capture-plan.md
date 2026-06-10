# Companion-Owned Job Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move URL-first job capture, crawl status, cleaned text, and retry/delete lifecycle into the local companion with SQLite-backed persistence.

**Architecture:** The companion becomes the owner of intake jobs and exposes `/jobs` APIs. The web app submits a URL, renders companion-owned pending/ready/failed jobs, and stops blocking job creation on Playwright extraction. Crawling remains generic and stores cleaned text only; AI parsing is explicitly deferred.

**Tech Stack:** Fastify 5, Zod 4, `fastify-type-provider-zod`, Node 22 `node:sqlite`, Playwright, React 19, TanStack Router, Vitest, TypeScript.

`node:sqlite` is available in the local Node runtime and avoids adding a native SQLite dependency. It currently emits Node's experimental SQLite warning; keep that warning acceptable for this local companion unless verification shows TypeScript or runtime incompatibility.

---

## File Structure

- Modify `apps/companion/src/schema.ts`
  - Add `CompanionJob`, crawl status, create-job request, route params, and delete response schemas.
- Create `apps/companion/src/jobs/repository.ts`
  - Own SQLite schema initialization and CRUD operations for companion jobs.
- Create `apps/companion/src/jobs/crawl-queue.ts`
  - Own in-process crawl scheduling, status transitions, retry behavior, and stale startup recovery.
- Create `apps/companion/src/jobs/repository.test.ts`
  - Test durable SQLite persistence and row mapping.
- Create `apps/companion/src/jobs/crawl-queue.test.ts`
  - Test crawl success, failure, retry, and deleted-job behavior with mocked crawler.
- Modify `apps/companion/src/extract/playwright.ts`
  - Return generic cleaned text instead of semantic job fields for the new crawl queue.
- Modify `apps/companion/src/extract/playwright.test.ts`
  - Assert generic cleanup output, not company/title/location extraction.
- Modify `apps/companion/src/server.ts`
  - Register `/jobs`, `/jobs/:id`, `/jobs/:id/retry-crawl`, and `DELETE /jobs/:id`.
- Modify `apps/companion/src/server.test.ts`
  - Add route tests for companion-owned jobs and update OpenAPI assertions.
- Modify `apps/companion/src/openapi.test.ts`
  - Assert new job schemas and endpoints are present in generated OpenAPI.
- Regenerate `apps/companion/openapi.json`.
- Modify `apps/web/src/lib/local-companion-client.ts`
  - Replace extract-only client with companion job client functions.
- Modify `apps/web/src/lib/local-companion-client.test.ts`
  - Cover create/list/retry/delete and service-unavailable errors.
- Modify `apps/web/src/components/jobs/NewJobApplicationModal.tsx`
  - Replace full form with URL-only submission.
- Create `apps/web/src/components/jobs/CompanionJobCard.tsx`
  - Render pending, ready, and failed companion jobs.
- Modify `apps/web/src/routes/jobs.tsx`
  - Use companion jobs for intake dashboard and polling.
- Modify `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx`
  - Assert the modal submits only a URL to the companion client.
- Create `apps/web/src/components/jobs/CompanionJobCard.test.tsx`
  - Assert pending, ready, and failed crawl states render correctly.

## Task 1: Add Companion Job Schemas

**Files:**
- Modify: `apps/companion/src/schema.ts`
- Test: `apps/companion/src/schema.test.ts`

- [ ] **Step 1: Extend schema tests first**

Add tests to `apps/companion/src/schema.test.ts`:

```ts
import {
	companionJobSchema,
	createJobRequestSchema,
	deleteJobResponseSchema,
	jobIdParamsSchema,
} from "./schema.js";

it("accepts a companion job with pending crawl state", () => {
	const parsed = companionJobSchema.parse({
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
	expect(z.globalRegistry.get(companionJobSchema)?.id).toBe("CompanionJob");
	expect(z.globalRegistry.get(deleteJobResponseSchema)?.id).toBe(
		"DeleteJobResponse",
	);
});
```

- [ ] **Step 2: Run schema tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/companion test -- src/schema.test.ts
```

Expected: FAIL because the new schemas are not exported yet.

- [ ] **Step 3: Add the Zod schemas**

Add this to `apps/companion/src/schema.ts` after the existing extraction schemas:

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

export const companionJobSchema = z
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

export type CompanionJob = z.infer<typeof companionJobSchema>;

export const companionJobsResponseSchema = z
	.object({
		jobs: z.array(companionJobSchema),
	})
	.strict();

export type CompanionJobsResponse = z.infer<typeof companionJobsResponseSchema>;

export const deleteJobResponseSchema = z
	.object({
		deleted: z.boolean(),
	})
	.strict();

export type DeleteJobResponse = z.infer<typeof deleteJobResponseSchema>;

z.globalRegistry.add(createJobRequestSchema, { id: "CreateJobRequest" });
z.globalRegistry.add(jobIdParamsSchema, { id: "JobIdParams" });
z.globalRegistry.add(companionJobSchema, { id: "CompanionJob" });
z.globalRegistry.add(companionJobsResponseSchema, {
	id: "CompanionJobsResponse",
});
z.globalRegistry.add(deleteJobResponseSchema, { id: "DeleteJobResponse" });
```

- [ ] **Step 4: Run schema tests**

Run:

```bash
pnpm --filter @open-resume/companion test -- src/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/companion/src/schema.ts apps/companion/src/schema.test.ts
git commit -m "feat(companion): add job intake schemas"
```

## Task 2: Add SQLite Job Repository

**Files:**
- Create: `apps/companion/src/jobs/repository.ts`
- Create: `apps/companion/src/jobs/repository.test.ts`

- [ ] **Step 1: Write repository tests**

Create `apps/companion/src/jobs/repository.test.ts`:

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
pnpm --filter @open-resume/companion test -- src/jobs/repository.test.ts
```

Expected: FAIL because `repository.ts` does not exist.

- [ ] **Step 3: Implement repository**

Create `apps/companion/src/jobs/repository.ts`:

```ts
import { DatabaseSync } from "node:sqlite";
import type { CompanionJob, CrawlStatus } from "../schema.js";

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

function mapJob(row: JobRow): CompanionJob {
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
			return this.getJob(input.id) as CompanionJob;
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
pnpm --filter @open-resume/companion test -- src/jobs/repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/companion/src/jobs/repository.ts apps/companion/src/jobs/repository.test.ts
git commit -m "feat(companion): persist intake jobs in sqlite"
```

## Task 3: Convert Playwright Extraction To Generic Cleaned Text

**Files:**
- Modify: `apps/companion/src/extract/playwright.ts`
- Modify: `apps/companion/src/extract/playwright.test.ts`

- [ ] **Step 1: Update Playwright tests**

Replace semantic assertions in `apps/companion/src/extract/playwright.test.ts` with:

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
pnpm --filter @open-resume/companion test -- src/extract/playwright.test.ts
```

Expected: FAIL because `crawlCleanedTextWithPlaywright` and `normalizePlaywrightCrawl` are not exported.

- [ ] **Step 3: Implement generic crawl result**

Update `apps/companion/src/extract/playwright.ts` to export:

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
pnpm --filter @open-resume/companion test -- src/extract/playwright.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/companion/src/extract/playwright.ts apps/companion/src/extract/playwright.test.ts
git commit -m "refactor(companion): crawl generic cleaned text"
```

## Task 4: Add Companion Crawl Queue

**Files:**
- Create: `apps/companion/src/jobs/crawl-queue.ts`
- Create: `apps/companion/src/jobs/crawl-queue.test.ts`

- [ ] **Step 1: Write crawl queue tests**

Create `apps/companion/src/jobs/crawl-queue.test.ts`:

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
pnpm --filter @open-resume/companion test -- src/jobs/crawl-queue.test.ts
```

Expected: FAIL because `crawl-queue.ts` does not exist.

- [ ] **Step 3: Implement crawl queue**

Create `apps/companion/src/jobs/crawl-queue.ts`:

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
pnpm --filter @open-resume/companion test -- src/jobs/crawl-queue.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/companion/src/jobs/crawl-queue.ts apps/companion/src/jobs/crawl-queue.test.ts
git commit -m "feat(companion): add job crawl queue"
```

## Task 5: Add Companion Job Routes

**Files:**
- Modify: `apps/companion/src/server.ts`
- Modify: `apps/companion/src/server.test.ts`

- [ ] **Step 1: Update server tests**

Add route tests to `apps/companion/src/server.test.ts` using `createServer({ jobRepository, crawlQueue })`:

```ts
import { createCrawlQueue } from "./jobs/crawl-queue.js";
import { createJobRepository } from "./jobs/repository.js";

it("creates companion jobs immediately without waiting for crawl completion", async () => {
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

it("lists, retries, gets, and deletes companion jobs", async () => {
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
pnpm --filter @open-resume/companion test -- src/server.test.ts
```

Expected: FAIL because `createServer` does not accept repository/queue options and `/jobs` routes do not exist.

- [ ] **Step 3: Modify `createServer` options and register job routes**

In `apps/companion/src/server.ts`, extend imports and options:

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
	companionJobSchema,
	companionJobsResponseSchema,
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
	process.env.OPEN_RESUME_COMPANION_DB_PATH ??
	resolve(process.cwd(), ".open-resume-companion/jobs.sqlite");
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
				201: companionJobSchema,
				400: companionErrorResponseSchema,
				500: companionErrorResponseSchema,
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
			summary: "List local companion jobs",
			response: {
				200: companionJobsResponseSchema,
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
			summary: "Get one local companion job",
			params: jobIdParamsSchema,
			response: {
				200: companionJobSchema,
				404: companionErrorResponseSchema,
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
			summary: "Retry crawling a failed or pending local companion job",
			params: jobIdParamsSchema,
			response: {
				200: companionJobSchema,
				404: companionErrorResponseSchema,
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
			summary: "Delete a local companion job",
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
pnpm --filter @open-resume/companion test -- src/server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/companion/src/server.ts apps/companion/src/server.test.ts apps/companion/src/openapi.ts
git commit -m "feat(companion): add job intake routes"
```

## Task 6: Update OpenAPI Contract

**Files:**
- Modify: `apps/companion/src/openapi.test.ts`
- Modify: `apps/companion/openapi.json`

- [ ] **Step 1: Extend OpenAPI tests**

Update required schemas in `apps/companion/src/openapi.test.ts` to include:

```ts
"CreateJobRequest",
"JobIdParams",
"CompanionJob",
"CompanionJobsResponse",
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
pnpm --filter @open-resume/companion test -- src/openapi.test.ts
```

Expected: FAIL until `apps/companion/openapi.json` is regenerated.

- [ ] **Step 3: Regenerate OpenAPI**

Run:

```bash
pnpm companion:openapi
```

Expected: `apps/companion/openapi.json` updates with `/jobs` paths and new schemas.

- [ ] **Step 4: Run OpenAPI tests and lint**

Run:

```bash
pnpm --filter @open-resume/companion test -- src/openapi.test.ts
pnpm --filter @open-resume/companion openapi:lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/companion/src/openapi.test.ts apps/companion/openapi.json
git commit -m "test(companion): cover job intake openapi contract"
```

## Task 7: Replace Web Companion Client

**Files:**
- Modify: `apps/web/src/lib/local-companion-client.ts`
- Modify: `apps/web/src/lib/local-companion-client.test.ts`

- [ ] **Step 1: Replace client tests**

Update `apps/web/src/lib/local-companion-client.test.ts` to cover:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createCompanionJob,
	deleteCompanionJob,
	listCompanionJobs,
	retryCompanionJobCrawl,
} from "./local-companion-client";

describe("local companion client", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("creates a companion job", async () => {
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

		const result = await createCompanionJob("https://example.com/job");

		expect(result).toMatchObject({
			id: "job-1",
			crawlStatus: "pending",
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/jobs",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("lists companion jobs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ jobs: [] }),
			})),
		);

		await expect(listCompanionJobs()).resolves.toEqual([]);
	});

	it("retries and deletes companion jobs", async () => {
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

		await expect(retryCompanionJobCrawl("job-1")).resolves.toMatchObject({
			id: "job-1",
		});
		await expect(deleteCompanionJob("job-1")).resolves.toEqual({
			deleted: true,
		});
	});

	it("returns a user-facing error when the companion is unavailable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);

		await expect(listCompanionJobs()).rejects.toThrow(
			"Local companion is not reachable",
		);
	});
});
```

- [ ] **Step 2: Run client tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/web test -- src/lib/local-companion-client.test.ts
```

Expected: FAIL because the new functions do not exist.

- [ ] **Step 3: Implement companion job client**

Replace `apps/web/src/lib/local-companion-client.ts` with:

```ts
import { z } from "zod";

const companionBaseUrl = "http://127.0.0.1:47321";

const companionJobSchema = z.object({
	id: z.string(),
	sourceUrl: z.string().url(),
	crawlStatus: z.enum(["pending", "crawling", "ready", "failed"]),
	crawlError: z.string().nullable(),
	cleanedText: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	crawledAt: z.number().nullable(),
});

const companionJobsResponseSchema = z.object({
	jobs: z.array(companionJobSchema),
});

const deleteJobResponseSchema = z.object({
	deleted: z.boolean(),
});

export type LocalCompanionJob = z.infer<typeof companionJobSchema>;

async function companionFetch(path: string, init?: RequestInit): Promise<Response> {
	try {
		return await fetch(`${companionBaseUrl}${path}`, init);
	} catch {
		throw new Error(
			"Local companion is not reachable. Start it with pnpm companion:dev.",
		);
	}
}

async function parseCompanionResponse<T>(
	response: Response,
	schema: z.ZodType<T>,
	fallbackMessage: string,
): Promise<T> {
	if (!response.ok) {
		throw new Error(fallbackMessage);
	}
	return schema.parse(await response.json());
}

export async function createCompanionJob(
	sourceUrl: string,
): Promise<LocalCompanionJob> {
	const response = await companionFetch("/jobs", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ sourceUrl }),
	});
	return parseCompanionResponse(
		response,
		companionJobSchema,
		"Local companion could not create this job.",
	);
}

export async function listCompanionJobs(): Promise<LocalCompanionJob[]> {
	const response = await companionFetch("/jobs");
	const parsed = await parseCompanionResponse(
		response,
		companionJobsResponseSchema,
		"Local companion could not list jobs.",
	);
	return parsed.jobs;
}

export async function retryCompanionJobCrawl(
	id: string,
): Promise<LocalCompanionJob> {
	const response = await companionFetch(`/jobs/${id}/retry-crawl`, {
		method: "POST",
	});
	return parseCompanionResponse(
		response,
		companionJobSchema,
		"Local companion could not retry this crawl.",
	);
}

export async function deleteCompanionJob(
	id: string,
): Promise<{ deleted: boolean }> {
	const response = await companionFetch(`/jobs/${id}`, {
		method: "DELETE",
	});
	return parseCompanionResponse(
		response,
		deleteJobResponseSchema,
		"Local companion could not delete this job.",
	);
}
```

- [ ] **Step 4: Run client tests**

Run:

```bash
pnpm --filter @open-resume/web test -- src/lib/local-companion-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/local-companion-client.ts apps/web/src/lib/local-companion-client.test.ts
git commit -m "feat(web): add companion job client"
```

## Task 8: Simplify New Job Modal

**Files:**
- Modify: `apps/web/src/components/jobs/NewJobApplicationModal.tsx`
- Modify: `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx`

- [ ] **Step 1: Update modal tests**

Modify `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx` to assert:

```ts
it("submits only a URL to the local companion", async () => {
	const createCompanionJob = vi.mocked(localCompanion.createCompanionJob);
	createCompanionJob.mockResolvedValue({
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

	expect(createCompanionJob).toHaveBeenCalledWith("https://example.com/job");
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
import { createCompanionJob } from "#/lib/local-companion-client";

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
			await createCompanionJob(trimmedUrl);
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

## Task 9: Add Companion Job Dashboard Cards

**Files:**
- Create: `apps/web/src/components/jobs/CompanionJobCard.tsx`
- Create: `apps/web/src/components/jobs/CompanionJobCard.test.tsx`
- Modify: `apps/web/src/routes/jobs.tsx`

- [ ] **Step 1: Write card tests**

Create `apps/web/src/components/jobs/CompanionJobCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompanionJobCard from "./CompanionJobCard";

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

describe("CompanionJobCard", () => {
	it("renders pending jobs without company or title", () => {
		render(
			<CompanionJobCard
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
			<CompanionJobCard
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
			<CompanionJobCard
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
pnpm --filter @open-resume/web test -- src/components/jobs/CompanionJobCard.test.tsx
```

Expected: FAIL because the card component does not exist.

- [ ] **Step 3: Implement card**

Create `apps/web/src/components/jobs/CompanionJobCard.tsx`:

```tsx
import { RotateCcw, Trash2 } from "lucide-react";
import type { LocalCompanionJob } from "#/lib/local-companion-client";

interface CompanionJobCardProps {
	job: LocalCompanionJob;
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

export default function CompanionJobCard({
	job,
	onRetry,
	onDelete,
}: CompanionJobCardProps) {
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
					Crawl is queued locally. This card will update when the companion
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
pnpm --filter @open-resume/web test -- src/components/jobs/CompanionJobCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Wire dashboard to companion jobs**

In `apps/web/src/routes/jobs.tsx`, fetch jobs with `listCompanionJobs`, poll every 2 seconds while mounted, group by status, and render `CompanionJobCard`. Keep the old local `JobApplicationCard` import out of the first screen.

Use this state shape:

```ts
const [companionJobs, setCompanionJobs] = useState<LocalCompanionJob[]>([]);
const [loadError, setLoadError] = useState("");
```

Use this grouping:

```ts
const pendingJobs = companionJobs.filter((job) =>
	["pending", "crawling"].includes(job.crawlStatus),
);
const readyJobs = companionJobs.filter((job) => job.crawlStatus === "ready");
const failedJobs = companionJobs.filter((job) => job.crawlStatus === "failed");
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm --filter @open-resume/web typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/jobs/CompanionJobCard.tsx apps/web/src/components/jobs/CompanionJobCard.test.tsx apps/web/src/routes/jobs.tsx
git commit -m "feat(web): show companion job intake queue"
```

## Task 10: Full Verification

**Files:**
- No source files.

- [ ] **Step 1: Run companion tests**

Run:

```bash
pnpm --filter @open-resume/companion test
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
- the companion eventually moves it to Ready or Failed
- failed jobs can be retried
- jobs can be deleted
- refreshing the browser does not delete companion jobs

- [ ] **Step 7: Commit verification fixes if any files changed**

If verification required fixes, inspect the changed files:

```bash
git status --short
```

Then commit the specific files that changed. For example, if the only fix was in the companion server:

```bash
git add apps/companion/src/server.ts apps/companion/src/server.test.ts
git commit -m "fix: stabilize companion job capture"
```

Expected: no uncommitted implementation changes remain.
