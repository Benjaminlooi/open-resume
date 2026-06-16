import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Fastify from "fastify";
import type { CreateServerOptions } from "./config.js";
import { resolveConfig } from "./config.js";
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

export function createServer(options: CreateServerOptions = {}) {
	const config = resolveConfig(options);
	mkdirSync(config.screenshotsPath, { recursive: true });

	const server = Fastify({
		logger: config.logStream
			? {
					level: config.logLevel,
					redact: ["req.headers.authorization", "req.headers.cookie"],
					stream: config.logStream,
				}
			: config.logLevel === "silent"
				? false
				: {
						level: config.logLevel,
						redact: ["req.headers.authorization", "req.headers.cookie"],
					},
	});

	/**
	 * Dependency Injection & Self-Assembly
	 *
	 * If dependencies like jobRepository or crawlQueue are provided in the options,
	 * we use them (useful for tests). Otherwise, we "self-assemble" by creating
	 * default instances based on the resolved configuration.
	 */

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
			crawl: (sourceUrl, jobId) => {
				const screenshotPath = join(config.screenshotsPath, `${jobId}.png`);
				return crawlCleanedTextWithPlaywright(sourceUrl, {
					logger: server.log,
					logScrapedData: config.logScrapedData,
					headless: config.headless,
					screenshotPath,
				});
			},
			logger: server.log,
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
		server.register(
			createJobRoutes({
				jobRepository,
				crawlQueue,
				screenshotsPath: config.screenshotsPath,
			}),
		);
	});

	if (config.recoverJobsOnStartup) {
		crawlQueue.enqueueRunnableJobs();
	}

	return server;
}
