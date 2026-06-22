import { dirname, resolve } from "node:path";
import { z } from "zod";
import type { CrawlQueue } from "./job-postings/crawl-queue.js";
import type { JobRepository } from "./job-postings/repository.js";

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

export const AIProviderSchema = z.enum([
	"openai",
	"google",
	"anthropic",
	"deepseek",
]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const createServerOptionsSchema = z.object({
	/**
	 * Optional override for the crawl queue.
	 * Primarily used in tests to inject a mocked queue.
	 */
	crawlQueue: z.custom<CrawlQueue>().optional(),
	/**
	 * Path to the SQLite database file.
	 */
	databasePath: z.string().optional(),
	/**
	 * Optional override for the job repository.
	 * Primarily used in tests to inject an in-memory repository.
	 */
	jobRepository: z.custom<JobRepository>().optional(),
	/**
	 * Log level for the server.
	 */
	logLevel: LogLevelSchema.optional(),
	/**
	 * Whether to log the full scraped text from job postings.
	 */
	logScrapedData: z.boolean().optional(),
	/**
	 * Optional override for the log stream.
	 * Primarily used in tests to capture logs.
	 */
	logStream: z.custom<LogStream>().optional(),
	/**
	 * Whether to resume any unfinished jobs from the database on startup.
	 */
	recoverJobsOnStartup: z.boolean().optional(),
	/**
	 * Path to the candidate profile JSON file.
	 */
	profilePath: z.string().optional(),
	/**
	 * Path to the resume JSON file.
	 */
	resumePath: z.string().optional(),
	/**
	 * Whether to run the browser in headless mode.
	 */
	headless: z.boolean().optional(),
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
	screenshotsPath: string;
	ai: AIConfig;
	headless: boolean;
}

const EnvSchema = z.object({
	OPEN_RESUME_COMPANION_DB_PATH: z.string().optional(),
	OPEN_RESUME_COMPANION_LOG_LEVEL: LogLevelSchema.default("info"),
	OPEN_RESUME_COMPANION_LOG_SCRAPED_DATA: z.string().optional(),
	OPEN_RESUME_COMPANION_HEADLESS: z.string().optional(),
	OPEN_RESUME_COMPANION_AI_PROVIDER: AIProviderSchema.default("openai"),
	OPENAI_API_KEY: z.string().optional(),
	OPENAI_MODEL: z.string().default("gpt-4o-mini"),
	GEMINI_API_KEY: z.string().optional(),
	GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
	ANTHROPIC_API_KEY: z.string().optional(),
	ANTHROPIC_MODEL: z.string().default("claude-3-5-haiku-latest"),
	DEEPSEEK_API_KEY: z.string().optional(),
	DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
});

function isScrapedDataLoggingEnabled(value: string | undefined): boolean {
	return value === "1" || value === "true" || value === "yes";
}

function isHeadlessEnabled(value: string | undefined): boolean {
	if (value === undefined) return true;
	return value === "1" || value === "true" || value === "yes";
}

export function resolveConfig(options: CreateServerOptions): ResolvedConfig {
	const parsedOptions = createServerOptionsSchema.parse(options);
	const parsedEnv = EnvSchema.parse(process.env);

	const databasePath =
		parsedOptions.databasePath ??
		parsedEnv.OPEN_RESUME_COMPANION_DB_PATH ??
		resolve(process.cwd(), ".open-resume-companion/jobs.sqlite");

	const logLevel =
		parsedOptions.logLevel ?? parsedEnv.OPEN_RESUME_COMPANION_LOG_LEVEL;

	const logScrapedData =
		parsedOptions.logScrapedData ??
		isScrapedDataLoggingEnabled(
			parsedEnv.OPEN_RESUME_COMPANION_LOG_SCRAPED_DATA,
		);

	const headless =
		parsedOptions.headless ??
		isHeadlessEnabled(parsedEnv.OPEN_RESUME_COMPANION_HEADLESS);

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

	const screenshotsPath = resolve(dirname(databasePath), "screenshots");

	return {
		crawlQueue: parsedOptions.crawlQueue,
		databasePath,
		jobRepository: parsedOptions.jobRepository,
		logLevel,
		logScrapedData,
		logStream: parsedOptions.logStream,
		recoverJobsOnStartup: parsedOptions.recoverJobsOnStartup ?? false,
		profilePath:
			parsedOptions.profilePath ??
			resolve(dirname(databasePath), "profile.json"),
		resumePath:
			parsedOptions.resumePath ?? resolve(dirname(databasePath), "resume.json"),
		screenshotsPath,
		ai: {
			provider,
			apiKey,
			modelName,
		},
		headless,
	};
}
