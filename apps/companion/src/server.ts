import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Fastify from "fastify";
import { crawlCleanedTextWithPlaywright } from "./extract/playwright.js";
import type { CrawlQueue } from "./jobs/crawl-queue.js";
import { createCrawlQueue } from "./jobs/crawl-queue.js";
import type { JobRepository } from "./jobs/repository.js";
import { createJobRepository } from "./jobs/repository.js";
import { registerCors } from "./plugins/cors.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerOpenApi } from "./plugins/openapi.js";
import { createJobRoutes } from "./routes/job-routes.js";
import { createProfileRoutes } from "./routes/profile-routes.js";
import { createResumeRoutes } from "./routes/resume-routes.js";
import { createSystemRoutes } from "./routes/system-routes.js";

interface LogStream {
	write(message: string): void;
}

interface CreateServerOptions {
	crawlQueue?: CrawlQueue;
	databasePath?: string;
	jobRepository?: JobRepository;
	logLevel?: string;
	logScrapedData?: boolean;
	logStream?: LogStream;
	recoverJobsOnStartup?: boolean;
	profilePath?: string;
	resumePath?: string;
}

function isScrapedDataLoggingEnabled(value: string | undefined): boolean {
	return value === "1" || value === "true" || value === "yes";
}

function createLoggerOptions(options: CreateServerOptions) {
	const logLevel =
		options.logLevel ?? process.env.OPEN_RESUME_COMPANION_LOG_LEVEL;

	if (!logLevel || logLevel === "silent") {
		return false;
	}

	const loggerOptions = {
		level: logLevel,
		redact: ["req.headers.authorization", "req.headers.cookie"],
	};

	if (options.logStream) {
		return {
			...loggerOptions,
			stream: options.logStream,
		};
	}

	return loggerOptions;
}

function getDefaultDatabasePath(options: CreateServerOptions) {
	return (
		options.databasePath ??
		process.env.OPEN_RESUME_COMPANION_DB_PATH ??
		resolve(process.cwd(), ".open-resume-companion/jobs.sqlite")
	);
}

function getProfilePath(options: CreateServerOptions) {
	if (options.profilePath) {
		return options.profilePath;
	}
	const dbPath = getDefaultDatabasePath(options);
	return resolve(dirname(dbPath), "profile.json");
}

function getResumePath(options: CreateServerOptions) {
	if (options.resumePath) {
		return options.resumePath;
	}
	const dbPath = getDefaultDatabasePath(options);
	return resolve(dirname(dbPath), "resume.json");
}

export function createServer(options: CreateServerOptions = {}) {
	const logScrapedData =
		options.logScrapedData ??
		isScrapedDataLoggingEnabled(
			process.env.OPEN_RESUME_COMPANION_LOG_SCRAPED_DATA,
		);
	const server = Fastify({
		logger: createLoggerOptions(options),
	});
	const ownsRepository = !options.jobRepository;
	const jobRepository =
		options.jobRepository ??
		(() => {
			const databasePath = getDefaultDatabasePath(options);
			mkdirSync(dirname(databasePath), { recursive: true });
			return createJobRepository(databasePath);
		})();
	const crawlQueue =
		options.crawlQueue ??
		createCrawlQueue({
			repository: jobRepository,
			crawl: (sourceUrl) =>
				crawlCleanedTextWithPlaywright(sourceUrl, {
					logger: server.log,
					logScrapedData,
				}),
			logger: {
				error(bindings, message) {
					server.log.error(bindings, message);
				},
			},
			profilePath: getProfilePath(options),
			resumePath: getResumePath(options),
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
				getProfilePath: () => getProfilePath(options),
			}),
		);
		server.register(createResumeRoutes({ jobRepository }));
		server.register(createJobRoutes({ jobRepository, crawlQueue }));
	});

	if (options.recoverJobsOnStartup) {
		crawlQueue.enqueueRunnableJobs();
	}

	return server;
}
