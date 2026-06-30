# Refactoring Server Options and Environment Validation in Backend App

## Overview
Currently, configuration parsing, default option resolution, and environment variable fallbacks are scattered across multiple files in the backend app:
- `server.ts` resolves database and file paths dynamically in multiple helper functions.
- `ai-analyzer.ts` directly reads `process.env` and hardcodes default provider names (`"openai"`) and default model names (`"gpt-4o-mini"`, `"gemini-1.5-flash"`, etc.).

This design proposes centralizing all configuration parsing and environment variable loading into a new `config.ts` module using Zod. It enforces fail-fast validation and guarantees that business logic modules are completely decoupled from environment variables and fallback constants.

---

## Key Refinement Requirements

1. **Centralized Configuration (`config.ts`)**
   - Create a single module that parses and validates `createServer` options and the environment variables (`process.env`).
   - Define a Zod schema `createServerOptionsSchema` for inputs.
   - Define an `EnvSchema` to parse relevant environment variables.
   - Resolve and validate final configuration properties, returning a read-only `ResolvedConfig` type.

2. **Conditional Validation**
   - Use Zod schemas to ensure that if a specific AI provider is selected (e.g., `openai`, `google`, `anthropic`, `deepseek`), its corresponding API key env variable must be populated. Throw a descriptive validation error at boot time if it is missing.

3. **Zero-Fallback Business Logic**
   - Make `aiConfig` a required parameter of `analyzeJobPosting` in `ai-analyzer.ts`.
   - Remove all references to `process.env` and fallback strings (e.g., default models or providers) from the `ai-analyzer.ts` business logic.
   - Inject the resolved `aiConfig` from `server.ts` -> `crawl-queue.ts` -> `ai-analyzer.ts`.

4. **Decoupled Configuration Testing**
   - Move tests verifying environment variable defaults, custom model overrides, and key presence validations out of `ai-analyzer.test.ts` and into a new `config.test.ts` file.

---

## Detailed Architectural Specs

### 1. Unified Configuration Schema (`config.ts`)

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
	OPEN_RESUME_BACKEND_DB_PATH: z.string().optional(),
	OPEN_RESUME_BACKEND_LOG_LEVEL: LogLevelSchema.default("info"),
	OPEN_RESUME_BACKEND_LOG_SCRAPED_DATA: z.string().optional(),
	OPEN_RESUME_BACKEND_AI_PROVIDER: AIProviderSchema.default("openai"),
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
		parsedEnv.OPEN_RESUME_BACKEND_DB_PATH ??
		resolve(process.cwd(), ".open-resume-backend/jobs.sqlite");

	const logLevel = parsedOptions.logLevel ?? parsedEnv.OPEN_RESUME_BACKEND_LOG_LEVEL;

	const logScrapedData =
		parsedOptions.logScrapedData ??
		isScrapedDataLoggingEnabled(parsedEnv.OPEN_RESUME_BACKEND_LOG_SCRAPED_DATA);

	const provider = parsedEnv.OPEN_RESUME_BACKEND_AI_PROVIDER;
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

### 2. Integration inside `server.ts`

```typescript
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
		
	// ... (register plugins and routes using config/resolved paths) ...
}
```

---

## Verification Plan

### Automated Tests
- Run existing vitest tests to verify no regressions:
  ```bash
  pnpm backend:test
  ```
- Write a new `config.test.ts` verifying all env fallbacks and validation combinations.
