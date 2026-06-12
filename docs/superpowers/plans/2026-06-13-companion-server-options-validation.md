# Server Options and Environment Validation Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize options and environment variable validation in the companion app using Zod, enforce conditional validation for AI provider API keys, and remove all environment variable reads and hardcoded default models/providers from the core business logic (`ai-analyzer.ts`).

**Architecture:** Create a new `config.ts` module to handle options and environment validation. Update the server to use this config, and inject the resolved `aiConfig` configuration down into the crawl queue and the AI analyzer.

**Tech Stack:** Node.js, Fastify, Zod, Vitest.

---

### Task 1: Create `config.ts` and verify with new tests

**Files:**
- Create: `apps/companion/src/config.ts`
- Create: `apps/companion/src/config.test.ts`

- [ ] **Step 1: Write tests for config validation and resolution**
  Create `apps/companion/src/config.test.ts` verifying that:
  - Default DB path, profile path, and resume path resolve correctly based on workspace cwd.
  - Specifying custom paths in options overrides environment variables.
  - Invalid log levels throw Zod parsing errors.
  - Selecting an AI provider without its key environment variable throws a validation error.
  - Valid setups return a fully-populated `ResolvedConfig` object.

  Code content for `apps/companion/src/config.test.ts`:
  ```typescript
  import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
  import { resolve } from "node:path";
  import { resolveConfig } from "./config.js";

  describe("resolveConfig", () => {
  	const originalEnv = { ...process.env };

  	beforeEach(() => {
  		vi.stubEnv("OPENAI_API_KEY", "sk-test-openai");
  	});

  	afterEach(() => {
  		process.env = { ...originalEnv };
  		vi.unstubAllEnvs();
  	});

  	it("resolves default database and file paths when no options are provided", () => {
  		const config = resolveConfig({});
  		expect(config.databasePath).toContain(".open-resume-companion/jobs.sqlite");
  		expect(config.profilePath).toContain(".open-resume-companion/profile.json");
  		expect(config.resumePath).toContain(".open-resume-companion/resume.json");
  		expect(config.logLevel).toBe("info");
  		expect(config.ai.provider).toBe("openai");
  		expect(config.ai.apiKey).toBe("sk-test-openai");
  		expect(config.ai.modelName).toBe("gpt-4o-mini");
  	});

  	it("prefers custom options paths over defaults", () => {
  		const config = resolveConfig({
  			databasePath: "/tmp/custom.db",
  			profilePath: "/tmp/profile.json",
  			resumePath: "/tmp/resume.json",
  		});
  		expect(config.databasePath).toBe("/tmp/custom.db");
  		expect(config.profilePath).toBe("/tmp/profile.json");
  		expect(config.resumePath).toBe("/tmp/resume.json");
  	});

  	it("throws an error if an invalid log level is provided", () => {
  		expect(() => resolveConfig({ logLevel: "invalid-level" as any })).toThrow();
  	});

  	it("throws an error if the selected provider key is missing", () => {
  		vi.stubEnv("OPEN_RESUME_COMPANION_AI_PROVIDER", "google");
  		vi.unstubAllEnvs(); // Remove OPENAI_API_KEY as well
  		expect(() => resolveConfig({})).toThrow(/AI Provider "google" is selected, but its required API key/);
  	});

  	it("correctly resolves other providers when their key is present", () => {
  		vi.stubEnv("OPEN_RESUME_COMPANION_AI_PROVIDER", "google");
  		vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
  		const config = resolveConfig({});
  		expect(config.ai.provider).toBe("google");
  		expect(config.ai.apiKey).toBe("gemini-test-key");
  		expect(config.ai.modelName).toBe("gemini-1.5-flash");
  	});
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @open-resume/companion test config.test.ts`
  Expected: FAIL with "Cannot find module './config.js'" or similar compile/import error.

- [ ] **Step 3: Write config implementation**
  Create `apps/companion/src/config.ts`:
  ```typescript
  import { resolve, dirname } from "node:path";
  import { z } from "zod";
  import type { CrawlQueue } from "./jobs/crawl-queue.js";
  import type { JobRepository } from "./jobs/repository.js";

  export const LogLevelSchema = z.enum([
  	"info",
  	"error",
  	"warn",
  	"debug",
  	"fatal",
  	"trace",
  	"silent",
  ]);

  interface LogStream {
  	write(message: string): void;
  }

  export const AIProviderSchema = z.enum(["openai", "google", "anthropic", "deepseek"]);
  export type AIProvider = z.infer<typeof AIProviderSchema>;

  export const createServerOptionsSchema = z.object({
  	crawlQueue: z.custom<CrawlQueue>().optional(),
  	databasePath: z.string().optional(),
  	jobRepository: z.custom<JobRepository>().optional(),
  	logLevel: LogLevelSchema.optional(),
  	logScrapedData: z.boolean().optional(),
  	logStream: z.custom<LogStream>().optional(),
  	recoverJobsOnStartup: z.boolean().optional(),
  	profilePath: z.string().optional(),
  	resumePath: z.string().optional(),
  });

  export type CreateServerOptions = z.infer<typeof createServerOptionsSchema>;

  export interface AIConfig {
  	provider: AIProvider;
  	apiKey: string;
  	modelName: string;
  }

  export interface ResolvedConfig {
  	crawlQueue?: CrawlQueue;
  	databasePath: string;
  	jobRepository?: JobRepository;
  	logLevel: z.infer<typeof LogLevelSchema>;
  	logScrapedData: boolean;
  	logStream?: LogStream;
  	recoverJobsOnStartup: boolean;
  	profilePath: string;
  	resumePath: string;
  	ai: AIConfig;
  }

  const EnvSchema = z.object({
  	OPEN_RESUME_COMPANION_DB_PATH: z.string().optional(),
  	OPEN_RESUME_COMPANION_LOG_LEVEL: LogLevelSchema.default("info"),
  	OPEN_RESUME_COMPANION_LOG_SCRAPED_DATA: z.string().optional(),
  	OPEN_RESUME_COMPANION_AI_PROVIDER: AIProviderSchema.default("openai"),
  	OPENAI_API_KEY: z.string().optional(),
  	OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  	GEMINI_API_KEY: z.string().optional(),
  	GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  	ANTHROPIC_API_KEY: z.string().optional(),
  	ANTHROPIC_MODEL: z.string().default("claude-3-5-haiku-latest"),
  	DEEPSEEK_API_KEY: z.string().optional(),
  	DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  });

  function isScrapedDataLoggingEnabled(value: string | undefined): boolean {
  	return value === "1" || value === "true" || value === "yes";
  }

  export function resolveConfig(options: CreateServerOptions): ResolvedConfig {
  	const parsedOptions = createServerOptionsSchema.parse(options);
  	const parsedEnv = EnvSchema.parse(process.env);

  	const databasePath =
  		parsedOptions.databasePath ??
  		parsedEnv.OPEN_RESUME_COMPANION_DB_PATH ??
  		resolve(process.cwd(), ".open-resume-companion/jobs.sqlite");

  	const logLevel = parsedOptions.logLevel ?? parsedEnv.OPEN_RESUME_COMPANION_LOG_LEVEL;

  	const logScrapedData =
  		parsedOptions.logScrapedData ??
  		isScrapedDataLoggingEnabled(parsedEnv.OPEN_RESUME_COMPANION_LOG_SCRAPED_DATA);

  	const provider = parsedEnv.OPEN_RESUME_COMPANION_AI_PROVIDER;
  	let apiKey: string | undefined;
  	let modelName: string | undefined;

  	switch (provider) {
  		case "openai":
  			apiKey = parsedEnv.OPENAI_API_KEY;
  			modelName = parsedEnv.OPENAI_MODEL;
  			break;
  		case "google":
  			apiKey = parsedEnv.GEMINI_API_KEY;
  			modelName = parsedEnv.GEMINI_MODEL;
  			break;
  		case "anthropic":
  			apiKey = parsedEnv.ANTHROPIC_API_KEY;
  			modelName = parsedEnv.ANTHROPIC_MODEL;
  			break;
  		case "deepseek":
  			apiKey = parsedEnv.DEEPSEEK_API_KEY;
  			modelName = parsedEnv.DEEPSEEK_MODEL;
  			break;
  	}

  	if (!apiKey) {
  		throw new Error(
  			`AI Provider "${provider}" is selected, but its required API key environment variable is not defined or empty.`,
  		);
  	}

  	return {
  		crawlQueue: parsedOptions.crawlQueue,
  		databasePath,
  		jobRepository: parsedOptions.jobRepository,
  		logLevel,
  		logScrapedData,
  		logStream: parsedOptions.logStream,
  		recoverJobsOnStartup: parsedOptions.recoverJobsOnStartup ?? false,
  		profilePath: parsedOptions.profilePath ?? resolve(dirname(databasePath), "profile.json"),
  		resumePath: parsedOptions.resumePath ?? resolve(dirname(databasePath), "resume.json"),
  		ai: {
  			provider,
  			apiKey,
  			modelName,
  		},
  	};
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter @open-resume/companion test config.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit config files**
  Run:
  ```bash
  git add apps/companion/src/config.ts apps/companion/src/config.test.ts
  git commit -m "feat(companion): add centralized config and validation"
  ```

---

### Task 2: Refactor `ai-analyzer.ts` and update tests

**Files:**
- Modify: `apps/companion/src/jobs/ai-analyzer.ts`
- Modify: `apps/companion/src/jobs/ai-analyzer.test.ts`

- [ ] **Step 1: Update `ai-analyzer.ts` signature and model creation**
  Modify [ai-analyzer.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/companion/src/jobs/ai-analyzer.ts#L47-L124) to accept required `aiConfig`, remove all environment variable accesses, and remove local defaults.

  Modified code section:
  ```typescript
  export interface AIConfig {
  	provider: "openai" | "google" | "anthropic" | "deepseek";
  	apiKey: string;
  	modelName: string;
  }

  export async function analyzeJobPosting(input: {
  	profilePath: string;
  	resumePath?: string;
  	resumeContent?: string;
  	cleanedText: string;
  	aiConfig: AIConfig; // Required
  }): Promise<AIAnalysisResult> {
  	if (!existsSync(input.profilePath)) {
  		throw new Error(
  			"Candidate profile not found. Please set up your profile in the settings panel.",
  		);
  	}
  	if (
  		input.resumeContent === undefined &&
  		(!input.resumePath || !existsSync(input.resumePath))
  	) {
  		throw new Error(
  			"Synced default resume not found. Please sync your resume in the settings panel.",
  		);
  	}

  	const profileContent = readFileSync(input.profilePath, "utf8").trim();
  	if (!profileContent) {
  		throw new Error("Candidate profile is empty.");
  	}

  	let resumeContent: string;
  	if (input.resumeContent !== undefined) {
  		resumeContent = input.resumeContent.trim();
  	} else {
  		const resumePath = input.resumePath as string;
  		resumeContent = readFileSync(resumePath, "utf8").trim();
  	}
  	if (!resumeContent) {
  		throw new Error("Synced default resume is empty.");
  	}

  	const { provider, apiKey, modelName } = input.aiConfig;
  	let modelInstance: any;

  	if (provider === "openai") {
  		const openai = createOpenAI({ apiKey });
  		modelInstance = openai(modelName);
  	} else if (provider === "google") {
  		const google = createGoogleGenerativeAI({ apiKey });
  		modelInstance = google(modelName);
  	} else if (provider === "anthropic") {
  		const anthropic = createAnthropic({ apiKey });
  		modelInstance = anthropic(modelName);
  	} else if (provider === "deepseek") {
  		const deepseek = createOpenAI({
  			apiKey,
  			baseURL: "https://api.deepseek.com/v1",
  		});
  		modelInstance = deepseek(modelName);
  	} else {
  		throw new Error(`Unsupported AI provider: ${provider}`);
  	}
  ```

- [ ] **Step 2: Update `ai-analyzer.test.ts`**
  Modify [ai-analyzer.test.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/companion/src/jobs/ai-analyzer.test.ts):
  - Remove all tests checking environment variable/config-resolution defaults (as these are moved to `config.test.ts` in Task 1).
  - Update all `analyzeJobPosting` calls in the test file to pass a mock/explicit `aiConfig` object.

  Example call in tests:
  ```typescript
  const mockAiConfig = {
  	provider: "openai" as const,
  	apiKey: "sk-test-openai",
  	modelName: "gpt-4o-mini",
  };

  // call with:
  analyzeJobPosting({
  	profilePath: mockProfilePath,
  	resumePath: mockResumePath,
  	cleanedText: "...",
  	aiConfig: mockAiConfig,
  });
  ```

- [ ] **Step 3: Run AI Analyzer tests to verify**
  Run: `pnpm --filter @open-resume/companion test ai-analyzer.test.ts`
  Expected: PASS.

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add apps/companion/src/jobs/ai-analyzer.ts apps/companion/src/jobs/ai-analyzer.test.ts
  git commit -m "refactor(companion): decouple ai-analyzer from env variable fallbacks"
  ```

---

### Task 3: Update `crawl-queue.ts` and `crawl-queue.test.ts`

**Files:**
- Modify: `apps/companion/src/jobs/crawl-queue.ts`
- Modify: `apps/companion/src/jobs/crawl-queue.test.ts`

- [ ] **Step 1: Pass `aiConfig` through `CrawlQueueOptions`**
  Update [crawl-queue.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/companion/src/jobs/crawl-queue.ts) to accept `aiConfig` and forward it to `analyzeJobPosting`.

  Modified section in `crawl-queue.ts`:
  ```typescript
  import type { AIConfig } from "./ai-analyzer.js";

  interface CrawlQueueOptions {
  	repository: JobRepository;
  	crawl?: (sourceUrl: string) => Promise<CleanedPageCrawlResult>;
  	logger?: CrawlQueueLogger;
  	now?: () => number;
  	profilePath?: string;
  	resumePath?: string;
  	analyze?: typeof analyzeJobPosting;
  	aiConfig: AIConfig; // Required
  }
  ```
  Pass `aiConfig: options.aiConfig` in the `analyze` call:
  ```typescript
  				const aiResult = await analyze({
  					profilePath: options.profilePath ?? "",
  					...(defaultResume
  						? { resumeContent: JSON.stringify(defaultResume.content) }
  						: { resumePath: options.resumePath }),
  					cleanedText,
  					aiConfig: options.aiConfig,
  				});
  ```

- [ ] **Step 2: Update `crawl-queue.test.ts`**
  Modify [crawl-queue.test.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/companion/src/jobs/crawl-queue.test.ts) to pass a dummy `aiConfig` into `createCrawlQueue()`.
  ```typescript
  const crawlQueue = createCrawlQueue({
  	repository,
  	crawl: async () => ({ ... }),
  	aiConfig: { provider: "openai", apiKey: "test-key", modelName: "gpt-4o-mini" },
  });
  ```

- [ ] **Step 3: Run crawl queue tests to verify**
  Run: `pnpm --filter @open-resume/companion test crawl-queue.test.ts`
  Expected: PASS.

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add apps/companion/src/jobs/crawl-queue.ts apps/companion/src/jobs/crawl-queue.test.ts
  git commit -m "refactor(companion): pass aiConfig through crawl queue options"
  ```

---

### Task 4: Integrate `resolveConfig` into `server.ts` and update tests

**Files:**
- Modify: `apps/companion/src/server.ts`
- Modify: `apps/companion/src/server.test.ts`

- [ ] **Step 1: Replace parameters, helpers, and bootstrap logic in `server.ts`**
  Update `apps/companion/src/server.ts` to call `resolveConfig`, remove all duplicate fallback methods (`getDefaultDatabasePath`, `getProfilePath`, `getResumePath`, `createLoggerOptions`), and pass the resolved values down.

  Modified file code:
  ```typescript
  import { mkdirSync } from "node:fs";
  import { dirname } from "node:path";
  import Fastify from "fastify";
  import { crawlCleanedTextWithPlaywright } from "./extract/playwright.js";
  import { createCrawlQueue } from "./jobs/crawl-queue.js";
  import { createJobRepository } from "./jobs/repository.js";
  import { registerCors } from "./plugins/cors.js";
  import { registerErrorHandler } from "./plugins/error-handler.js";
  import { registerOpenApi } from "./plugins/openapi.js";
  import { createJobRoutes } from "./routes/job-routes.js";
  import { createProfileRoutes } from "./routes/profile-routes.js";
  import { createResumeRoutes } from "./routes/resume-routes.js";
  import { createSystemRoutes } from "./routes/system-routes.js";
  import type { CreateServerOptions } from "./config.js";
  import { resolveConfig } from "./config.js";

  export function createServer(options: CreateServerOptions = {}) {
  	const config = resolveConfig(options);

  	const server = Fastify({
  		logger: config.logStream
  			? { level: config.logLevel, redact: ["req.headers.authorization"], stream: config.logStream }
  			: config.logLevel === "silent"
  				? false
  				: { level: config.logLevel, redact: ["req.headers.authorization"] },
  	});

  	const ownsRepository = !config.jobRepository;
  	const jobRepository =
  		config.jobRepository ??
  		(() => {
  			mkdirSync(dirname(config.databasePath), { recursive: true });
  			return createJobRepository(config.databasePath);
  		})();

  	const crawlQueue =
  		config.crawlQueue ??
  		createCrawlQueue({
  			repository: jobRepository,
  			crawl: (sourceUrl) =>
  				crawlCleanedTextWithPlaywright(sourceUrl, {
  					logger: server.log,
  					logScrapedData: config.logScrapedData,
  				}),
  			logger: {
  				error(bindings, message) {
  					server.log.error(bindings, message);
  				},
  			},
  			profilePath: config.profilePath,
  			resumePath: config.resumePath,
  			aiConfig: config.ai,
  		});

  	server.addHook("onClose", async () => {
  		if (ownsRepository) {
  			jobRepository.close();
  		}
  	});

  	server.register(registerOpenApi);
  	server.register(registerErrorHandler);
  	server.register(registerCors);

  	server.after(() => {
  		server.register(createSystemRoutes());
  		server.register(
  			createProfileRoutes({
  				jobRepository,
  				getProfilePath: () => config.profilePath,
  			}),
  		);
  		server.register(createResumeRoutes({ jobRepository }));
  		server.register(createJobRoutes({ jobRepository, crawlQueue }));
  	});

  	if (config.recoverJobsOnStartup) {
  		crawlQueue.enqueueRunnableJobs();
  	}

  	return server;
  }
  ```

- [ ] **Step 2: Update `server.test.ts` to pass required inputs**
  Update the test helper `createTestServer` in [server.test.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/companion/src/server.test.ts#L42-L84) to mock/set `OPENAI_API_KEY` env variable, or configure a default mock AI config on start.

- [ ] **Step 3: Run server tests to verify**
  Run: `pnpm --filter @open-resume/companion test server.test.ts`
  Expected: PASS.

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add apps/companion/src/server.ts apps/companion/src/server.test.ts
  git commit -m "refactor(companion): integrate resolveConfig into server bootstrap"
  ```

---

### Task 5: Verify Entire Workspace Build

- [ ] **Step 1: Check TypeScript compiler compilation**
  Run: `pnpm typecheck`
  Expected: Success without TS errors.

- [ ] **Step 2: Run all tests workspace-wide**
  Run: `pnpm test`
  Expected: All tests pass.

- [ ] **Step 3: Build package**
  Run: `pnpm build`
  Expected: Successful compilation of web and companion bundles.
