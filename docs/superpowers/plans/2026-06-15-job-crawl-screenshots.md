# Job Crawl Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture full-page PNG screenshots of crawled job pages (on both success and failure), store them on disk, serve them via a new Fastify endpoint, and show a screenshot preview tab in the backend jobs details dialog in the frontend.

**Architecture:** Playwright will save a `.png` screenshot of the job URL under `.open-resume-backend/screenshots/<job-id>.png`. Fastify will host a `GET /jobs/:id/screenshot` endpoint to stream this file as `image/png`. The React web app details dialog will render this image in a dedicated "Screenshot" tab.

**Tech Stack:** Playwright (Chromium), Fastify 5, React 19 (TanStack Start), Tailwind CSS v4, Biome, Vitest.

---

### Task 1: Add configuration for screenshot path

**Files:**
- Modify: `apps/backend/src/config.ts`
- Modify: `apps/backend/src/server.ts`
- Modify: `apps/backend/src/config.test.ts`

- [ ] **Step 1: Write config test**

  Modify `apps/backend/src/config.test.ts` to add a test asserting that `screenshotsPath` resolves.
  
  ```typescript
  // In apps/backend/src/config.test.ts:
  // Add in the first "resolves default database and file paths when no options are provided" test:
  expect(config.screenshotsPath).toContain(".open-resume-backend/screenshots");
  ```

- [ ] **Step 2: Run tests to verify failure**

  Run: `pnpm --filter @open-resume/backend test`
  Expected: FAIL with compilation error (property `screenshotsPath` does not exist on type `ResolvedConfig`).

- [ ] **Step 3: Implement `screenshotsPath` config**

  Modify `apps/backend/src/config.ts` to add `screenshotsPath` to `ResolvedConfig` and resolve it.
  
  ```typescript
  // In apps/backend/src/config.ts:
  // Add to ResolvedConfig interface:
  export interface ResolvedConfig {
  	// ... existing fields ...
  	screenshotsPath: string;
  }
  
  // Add in resolveConfig function before return:
  const screenshotsPath = resolve(dirname(databasePath), "screenshots");
  
  // Add screenshotsPath to the returned ResolvedConfig object:
  return {
  	// ... existing fields ...
  	screenshotsPath,
  };
  ```

- [ ] **Step 4: Initialize the screenshots directory on server startup**

  Modify `apps/backend/src/server.ts` to create the screenshots directory.
  
  ```typescript
  // In apps/backend/src/server.ts:
  // Inside createServer function, after resolving databasePath:
  mkdirSync(config.screenshotsPath, { recursive: true });
  ```

- [ ] **Step 5: Run tests to verify success**

  Run: `pnpm --filter @open-resume/backend test`
  Expected: PASS

- [ ] **Step 6: Commit changes**

  Run:
  ```bash
  git add apps/backend/src/config.ts apps/backend/src/server.ts apps/backend/src/config.test.ts
  git commit -m "feat(backend): resolve and initialize screenshots directory"
  ```

---

### Task 2: Playwright Screenshot Capture on Success & Failure

**Files:**
- Modify: `apps/backend/src/extract/playwright.ts`
- Modify: `apps/backend/src/extract/playwright.test.ts`

- [ ] **Step 1: Write test verifying screenshot file is created**

  Modify `apps/backend/src/extract/playwright.test.ts` to add a test that runs `crawlCleanedTextWithPlaywright` with a test screenshot path.
  
  ```typescript
  // In apps/backend/src/extract/playwright.test.ts:
  import { existsSync, unlinkSync } from "node:fs";
  import { join } from "node:path";
  
  // Inside describe("crawlCleanedTextWithPlaywright"), add:
  it("captures full-page screenshots", async () => {
  	const htmlContent = "<html><body><h1>Screenshot Page</h1></body></html>";
  	const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  	const screenshotPath = join(__dirname, "test-screenshot.png");
  
  	if (existsSync(screenshotPath)) {
  		unlinkSync(screenshotPath);
  	}
  
  	try {
  		await crawlCleanedTextWithPlaywright(dataUrl, { screenshotPath });
  		expect(existsSync(screenshotPath)).toBe(true);
  	} finally {
  		if (existsSync(screenshotPath)) {
  			unlinkSync(screenshotPath);
  		}
  	}
  }, 20000);
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm --filter @open-resume/backend test`
  Expected: FAIL (argument of type `{ screenshotPath: string; }` is not assignable to parameter of type `PlaywrightCrawlOptions`).

- [ ] **Step 3: Implement screenshot option and capture logic**

  Modify `apps/backend/src/extract/playwright.ts` to support `screenshotPath` in `ExtractionLogOptions` and implement screenshot taking on both success and failure states.
  
  ```typescript
  // In apps/backend/src/extract/playwright.ts:
  // Add to ExtractionLogOptions interface:
  interface ExtractionLogOptions {
  	logger?: ExtractionLogger;
  	logScrapedData?: boolean;
  	headless?: boolean;
  	screenshotPath?: string; // <--- add this
  }
  
  // Inside crawlCleanedTextWithPlaywright function:
  export async function crawlCleanedTextWithPlaywright(
  	sourceUrl: string,
  	options: ExtractionLogOptions = {},
  ): Promise<CleanedPageCrawlResult> {
  	const browser = await chromium.launch({ headless: options.headless ?? true });
  	let page: any = null; // using any or Page import
  
  	try {
  		page = await browser.newPage();
  		await page.goto(sourceUrl, {
  			waitUntil: "domcontentloaded",
  			timeout: 30000,
  		});
  		await page
  			.waitForLoadState("networkidle", { timeout: 10000 })
  			.catch(() => {});
  
  		// Take screenshot on successful load before reading frames
  		if (options.screenshotPath) {
  			try {
  				await page.screenshot({ path: options.screenshotPath, fullPage: true });
  			} catch (err) {
  				options.logger?.error({ error: err instanceof Error ? err.message : String(err) }, "failed to save screenshot on success");
  			}
  		}
  
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
  	} catch (error) {
  		// Capture screenshot of the error state (e.g. CAPTCHA page) if page is initialized
  		if (page && options.screenshotPath) {
  			try {
  				await page.screenshot({ path: options.screenshotPath, fullPage: true });
  			} catch (screenshotErr) {
  				// Ignore secondary screenshot errors on fail
  			}
  		}
  		throw error;
  	} finally {
  		await browser.close();
  	}
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm --filter @open-resume/backend test`
  Expected: PASS

- [ ] **Step 5: Commit changes**

  Run:
  ```bash
  git add apps/backend/src/extract/playwright.ts apps/backend/src/extract/playwright.test.ts
  git commit -m "feat(backend): capture screenshots on page crawl success and failure"
  ```

---

### Task 3: Crawl Queue Parameter update

**Files:**
- Modify: `apps/backend/src/jobs/crawl-queue.ts`
- Modify: `apps/backend/src/server.ts`

- [ ] **Step 1: Write test or modify crawl queue test signature**

  Update type definitions in `apps/backend/src/jobs/crawl-queue.ts` to pass `jobId` to the crawl function.
  
  ```typescript
  // In apps/backend/src/jobs/crawl-queue.ts:
  // Modify CrawlQueueOptions interface:
  interface CrawlQueueOptions {
  	repository: JobRepository;
  	crawl?: (sourceUrl: string, jobId: string) => Promise<CleanedPageCrawlResult>; // <--- add jobId
  	logger?: CrawlQueueLogger;
  	now?: () => number;
  	profilePath?: string;
  	resumePath?: string;
  	analyze?: typeof analyzeJobPosting;
  	aiConfig?: AIConfig;
  }
  ```

- [ ] **Step 2: Run typecheck to see errors**

  Run: `pnpm typecheck`
  Expected: FAIL with compilation error in `crawl-queue.ts` or `server.ts` due to mismatch of parameters.

- [ ] **Step 3: Update crawl queue crawl call & server crawl function**

  Modify `crawl-queue.ts` and `server.ts` to pass the job ID and resolve the screenshot output path.
  
  ```typescript
  // In apps/backend/src/jobs/crawl-queue.ts:
  // Inside runJob(id: string), where crawl is called (line 43):
  result = await crawl(job.sourceUrl, id);
  ```
  
  ```typescript
  // In apps/backend/src/server.ts:
  // Inside createServer function, where crawlQueue is configured:
  const crawlQueue =
  	config.crawlQueue ??
  	createCrawlQueue({
  		repository: jobRepository,
  		crawl: (sourceUrl, jobId) => {
  			const screenshotPath = join(config.screenshotsPath, `${jobId}.png`);
  			return crawlCleanedTextWithPlaywright(sourceUrl, {
  				logger: server.log,
  				logScrapedData: config.logScrapedData,
  				headless: config.headless,
  				screenshotPath,
  			});
  		},
  		logger: {
  			error(bindings, message) {
  				server.log.error(bindings, message);
  			},
  		},
  		profilePath: config.profilePath,
  		resumePath: config.resumePath,
  		aiConfig: config.ai,
  	});
  ```

- [ ] **Step 4: Run typecheck to verify success**

  Run: `pnpm typecheck`
  Expected: PASS

- [ ] **Step 5: Run tests to verify correctness**

  Run: `pnpm --filter @open-resume/backend test`
  Expected: PASS

- [ ] **Step 6: Commit changes**

  Run:
  ```bash
  git add apps/backend/src/jobs/crawl-queue.ts apps/backend/src/server.ts
  git commit -m "feat(backend): connect job ID to playwright crawler to name screenshots"
  ```

---

### Task 4: API Endpoint to serve screenshots

**Files:**
- Modify: `apps/backend/src/routes/context.ts`
- Modify: `apps/backend/src/routes/job-routes.ts`
- Modify: `apps/backend/src/server.ts`
- Modify: `apps/backend/src/server.test.ts`

- [ ] **Step 1: Write test for GET /jobs/:id/screenshot**

  Modify `apps/backend/src/server.test.ts` to test retrieving a screenshot.
  
  ```typescript
  // In apps/backend/src/server.test.ts:
  // Inside describe("Server tests"), write a test case for GET /jobs/:id/screenshot:
  it("GET /jobs/:id/screenshot returns 404 if screenshot does not exist", async () => {
  	const response = await app.inject({
  		method: "GET",
  		url: "/jobs/non-existent-id/screenshot",
  	});
  	expect(response.statusCode).toBe(404);
  });
  ```

- [ ] **Step 2: Run test to verify failure**

  Run: `pnpm --filter @open-resume/backend test`
  Expected: FAIL with status code 404 (or 404 with route not found if Fastify doesn't have the route at all).

- [ ] **Step 3: Define Context and Route for Screenshot serving and deletion**

  Modify `apps/backend/src/routes/context.ts` to include `screenshotsPath`.
  
  ```typescript
  // In apps/backend/src/routes/context.ts:
  export interface JobRouteContext {
  	jobRepository: JobRepository;
  	crawlQueue: CrawlQueue;
  	screenshotsPath: string; // <--- add this
  }
  ```
  
  Modify `apps/backend/src/routes/job-routes.ts` to add the screenshot route, and delete the screenshot file on job deletion.
  
  ```typescript
  // In apps/backend/src/routes/job-routes.ts:
  import { existsSync, createReadStream, unlinkSync } from "node:fs";
  import { join } from "node:path";
  
  // Register the route GET /jobs/:id/screenshot inside createJobRoutes:
  typedServer.get(
  	"/jobs/:id/screenshot",
  	{
  		schema: {
  			operationId: "getJobScreenshot",
  			tags: ["Jobs"],
  			summary: "Get a job crawl screenshot",
  			params: routeJobIdParamsSchema,
  			response: {
  				200: z.any().describe("The captured screenshot PNG image."),
  				404: backendErrorResponseSchema,
  			},
  		},
  	},
  	async (request, reply) => {
  		const job = context.jobRepository.getJob(request.params.id);
  		if (!job) {
  			return reply.status(404).send({ error: "Job not found" });
  		}
  
  		const screenshotPath = join(context.screenshotsPath, `${request.params.id}.png`);
  		if (!existsSync(screenshotPath)) {
  			return reply.status(404).send({ error: "Screenshot not found" });
  		}
  
  		const stream = createReadStream(screenshotPath);
  		return reply.type("image/png").send(stream);
  	},
  );
  
  // Modify DELETE /jobs/:id to unlink the screenshot:
  typedServer.delete(
  	"/jobs/:id",
  	{
  		schema: {
  			operationId: "deleteJob",
  			tags: ["Jobs"],
  			summary: "Delete a backend job",
  			params: routeJobIdParamsSchema,
  			response: {
  				200: deleteJobResponseSchema,
  			},
  		},
  	},
  	async (request) => {
  		const id = request.params.id;
  		const deleted = context.jobRepository.deleteJob(id);
  		if (deleted) {
  			const screenshotPath = join(context.screenshotsPath, `${id}.png`);
  			if (existsSync(screenshotPath)) {
  				try {
  					unlinkSync(screenshotPath);
  				} catch {
  					// Ignore deletion errors
  				}
  			}
  		}
  		return { deleted };
  	},
  );
  ```

- [ ] **Step 4: Update server initialization of Job Routes**

  Modify `apps/backend/src/server.ts` to pass `screenshotsPath: config.screenshotsPath` into `createJobRoutes`.
  
  ```typescript
  // In apps/backend/src/server.ts:
  // Inside the server.after registration of job routes:
  server.register(createJobRoutes({ jobRepository, crawlQueue, screenshotsPath: config.screenshotsPath }));
  ```

- [ ] **Step 5: Run tests to verify success**

  Run: `pnpm --filter @open-resume/backend test`
  Expected: PASS

- [ ] **Step 6: Export OpenAPI specification & verify**

  Run: `pnpm backend:openapi`
  Run: `pnpm --filter @open-resume/backend openapi:lint`
  Expected: PASS without redocly/Swagger validation errors.

- [ ] **Step 7: Commit changes**

  Run:
  ```bash
  git add apps/backend/src/routes/context.ts apps/backend/src/routes/job-routes.ts apps/backend/src/server.ts apps/backend/src/server.test.ts apps/backend/openapi.json
  git commit -m "feat(backend): serve screenshot route and cleanup on deletion"
  ```

---

### Task 5: Frontend Preview Dialog Tab

**Files:**
- Modify: `apps/web/src/components/jobs/BackendJobDetailsDialog.tsx`

- [ ] **Step 1: Implement the Screenshot preview tab**

  Modify `apps/web/src/components/jobs/BackendJobDetailsDialog.tsx` to add `screenshot` as an allowed active tab, import `Camera`, and display the screenshot preview when selected.
  
  ```typescript
  // In apps/web/src/components/jobs/BackendJobDetailsDialog.tsx:
  // Add Camera to lucide-react imports:
  import {
  	Loader2,
  	Sparkles,
  	CheckCircle2,
  	AlertTriangle,
  	ArrowRight,
  	ExternalLink,
  	Camera, // <--- add this
  } from "lucide-react";
  
  // Inside BackendJobDetailsDialog component:
  // Update state type:
  const [activeTab, setActiveTab] = useState<"ai" | "scraped" | "screenshot">("ai");
  const [screenshotError, setScreenshotError] = useState(false);
  
  // Inside useEffect resetting state:
  useEffect(() => {
  	setScreenshotError(false);
  	if (job.crawlStatus === "ready") {
  		setActiveTab("ai");
  	} else {
  		setActiveTab("scraped");
  	}
  }, [job.id, job.crawlStatus, isOpen]);
  
  // In the Tabs Header rendering list, append:
  <button
  	type="button"
  	id="details-tab-screenshot"
  	aria-controls="details-panel-screenshot"
  	onClick={() => setActiveTab("screenshot")}
  	role="tab"
  	aria-selected={activeTab === "screenshot"}
  	className={`px-4 py-2 font-bold text-sm border-b-4 -mb-[2px] transition-colors ${
  		activeTab === "screenshot"
  			? "border-main text-main-foreground"
  			: "border-transparent text-muted-foreground hover:text-foreground"
  	}`}
  >
  	📸 Screenshot
  </button>
  
  // In the Tab Content body rendering, append:
  {activeTab === "screenshot" && (
  	<div
  		id="details-panel-screenshot"
  		aria-labelledby="details-tab-screenshot"
  		role="tabpanel"
  		className="h-full flex flex-col"
  	>
  		{!screenshotError ? (
  			<div className="flex-1 min-h-[400px] overflow-y-auto rounded-base border-2 border-border p-2 bg-gray-50 flex justify-center shadow-light">
  				<img
  					src={`http://127.0.0.1:47321/jobs/${job.id}/screenshot`}
  					alt="Crawl Screenshot"
  					onError={() => setScreenshotError(true)}
  					className="max-w-full h-auto object-contain border border-border rounded-base"
  				/>
  			</div>
  		) : (
  			<div className="flex flex-col items-center justify-center py-12 text-center">
  				<AlertTriangle className="size-8 text-amber-500 mb-3" />
  				<p className="font-bold text-muted-foreground">
  					No screenshot available for this job crawl.
  				</p>
  			</div>
  		)}
  	</div>
  )}
  ```

- [ ] **Step 2: Verify typechecking and build**

  Run: `pnpm typecheck`
  Run: `pnpm build`
  Expected: PASS without compilation errors.

- [ ] **Step 3: Commit changes**

  Run:
  ```bash
  git add apps/web/src/components/jobs/BackendJobDetailsDialog.tsx
  git commit -m "feat(web): add Screenshot preview tab to job details dialog"
  ```
