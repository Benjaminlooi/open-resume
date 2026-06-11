import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import cors from "@fastify/cors";
import type { FastifyError } from "fastify";
import Fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { crawlCleanedTextWithPlaywright } from "./extract/playwright.js";
import type { CrawlQueue } from "./jobs/crawl-queue.js";
import { createCrawlQueue } from "./jobs/crawl-queue.js";
import type { JobRepository } from "./jobs/repository.js";
import { createJobRepository } from "./jobs/repository.js";
import { registerOpenApi } from "./openapi.js";
import {
	candidateProfileSchema,
	companionErrorResponseSchema,
	companionJobSchema,
	companionJobsResponseSchema,
	createJobRequestSchema,
	deleteJobResponseSchema,
	healthResponseSchema,
	jobIdParamsSchema,
	okResponseSchema,
	resumeSyncRequestSchema,
	syncedResumeResponseSchema,
} from "./schema.js";

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
	const dbPath = getDefaultDatabasePath(options);
	return resolve(dirname(dbPath), "profile.json");
}

function getResumePath(options: CreateServerOptions) {
	const dbPath = getDefaultDatabasePath(options);
	return resolve(dirname(dbPath), "resume.json");
}

// Fastify Swagger crashes when a registered component ref is used for params.
const routeJobIdParamsSchema = jobIdParamsSchema.extend({});

export function createServer(options: CreateServerOptions = {}) {
	const logScrapedData =
		options.logScrapedData ??
		isScrapedDataLoggingEnabled(
			process.env.OPEN_RESUME_COMPANION_LOG_SCRAPED_DATA,
		);
	const server = Fastify({
		logger: createLoggerOptions(options),
	});
	const typedServer = server.withTypeProvider<ZodTypeProvider>();
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
		});

	server.addHook("onClose", async () => {
		if (ownsRepository) {
			jobRepository.close();
		}
	});

	registerOpenApi(server);

	server.setErrorHandler((err: FastifyError, request, reply) => {
		if (hasZodFastifySchemaValidationErrors(err)) {
			request.log.warn(
				{ details: JSON.stringify(err.validation) },
				"invalid companion request",
			);
			return reply.status(400).send({
				error: "Invalid companion request",
				details: JSON.stringify(err.validation),
			});
		}

		const statusCode =
			typeof err.statusCode === "number" && err.statusCode >= 400
				? err.statusCode
				: 500;

		return reply.status(statusCode).send({
			error: err.message || "Internal server error",
		});
	});

	server.register(cors, {
		origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
	});

	server.after(() => {
		typedServer.get(
			"/health",
			{
				schema: {
					operationId: "getHealth",
					tags: ["System"],
					summary: "Check companion health",
					response: {
						200: healthResponseSchema,
					},
				},
			},
			async () => ({
				ok: true,
				service: "open-resume-companion",
			}),
		);

		typedServer.get(
			"/profile",
			{
				schema: {
					operationId: "getProfile",
					tags: ["Profile"],
					summary: "Get candidate profile",
					response: {
						200: candidateProfileSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async () => {
				const profilePath = getProfilePath(options);
				if (!existsSync(profilePath)) {
					const defaultProfile = {
						candidate: {
							fullName: "Benjamin Looi",
							email: "hello@benjaminlooi.dev",
							phone: "+60 12-4065-711",
							location: "Kuala Lumpur, Malaysia",
							linkedin: "linkedin.com/in/benjaminlooi",
							portfolioUrl: "https://www.benjaminlooi.dev",
							github: "github.com/benjaminlooi",
							twitter: "",
						},
						targetRoles: {
							primary: [
								"Senior Full Stack Engineer",
								"Senior Frontend Engineer",
							],
							archetypes: [
								{
									name: "Full Stack Product Engineer",
									level: "Senior",
									fit: "primary" as const,
								},
							],
						},
						narrative: {
							headline: "Product-minded Full Stack Engineer",
							exitStory: "After 5+ years shipping web systems...",
							superpowers: ["Modernizing legacy frontends"],
							proofPoints: [],
						},
						compensation: {
							targetRange: "Global remote",
							currency: "USD",
							minimum: "$50k",
							preferred: "$60k+",
							locationFlexibility: "Global remote-first",
						},
						location: {
							country: "Malaysia",
							city: "Kuala Lumpur",
							timezone: "ICT / UTC+7",
							visaStatus: "Unspecified",
							onsiteAvailability: "Remote-first preferred",
							remotePolicy: "Prioritize global remote",
						},
					};
					mkdirSync(dirname(profilePath), { recursive: true });
					writeFileSync(profilePath, JSON.stringify(defaultProfile, null, 2));
					return defaultProfile;
				}
				try {
					const data = readFileSync(profilePath, "utf8");
					return JSON.parse(data);
				} catch (_err) {
					throw new Error("Failed to read candidate profile");
				}
			},
		);

		typedServer.put(
			"/profile",
			{
				schema: {
					operationId: "updateProfile",
					tags: ["Profile"],
					summary: "Update candidate profile",
					body: candidateProfileSchema,
					response: {
						200: candidateProfileSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const profilePath = getProfilePath(options);
				mkdirSync(dirname(profilePath), { recursive: true });
				try {
					writeFileSync(profilePath, JSON.stringify(request.body, null, 2));
					return request.body;
				} catch (_err) {
					return reply
						.status(500)
						.send({ error: "Failed to save candidate profile" });
				}
			},
		);

		typedServer.get(
			"/profile/resume",
			{
				schema: {
					operationId: "getSyncedResume",
					tags: ["Profile"],
					summary: "Get synced default resume",
					response: {
						200: syncedResumeResponseSchema,
						404: companionErrorResponseSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async (_request, reply) => {
				const resumePath = getResumePath(options);
				if (!existsSync(resumePath)) {
					return reply.status(404).send({ error: "Synced resume not found" });
				}
				try {
					const data = readFileSync(resumePath, "utf8");
					return JSON.parse(data);
				} catch (_err) {
					return reply
						.status(500)
						.send({ error: "Failed to read synced resume" });
				}
			},
		);

		typedServer.put(
			"/profile/resume",
			{
				schema: {
					operationId: "syncResume",
					tags: ["Profile"],
					summary: "Sync default resume",
					body: resumeSyncRequestSchema,
					response: {
						200: okResponseSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resumePath = getResumePath(options);
				mkdirSync(dirname(resumePath), { recursive: true });
				try {
					writeFileSync(
						resumePath,
						JSON.stringify(request.body.resume, null, 2),
					);
					return { ok: true };
				} catch (_err) {
					return reply.status(500).send({ error: "Failed to sync resume" });
				}
			},
		);

		typedServer.get(
			"/openapi.json",
			{
				schema: {
					hide: true,
				},
			},
			async () => server.swagger(),
		);

		typedServer.post(
			"/jobs",
			{
				schema: {
					operationId: "createJob",
					tags: ["Jobs"],
					summary: "Create a companion job and enqueue crawling",
					body: createJobRequestSchema,
					response: {
						201: companionJobSchema,
						400: companionErrorResponseSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = jobRepository.createJob({
					id: randomUUID(),
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
					summary: "List companion jobs",
					response: {
						200: companionJobsResponseSchema,
					},
				},
			},
			async () => ({
				jobs: jobRepository.listJobs(),
			}),
		);

		typedServer.get(
			"/jobs/:id",
			{
				schema: {
					operationId: "getJob",
					tags: ["Jobs"],
					summary: "Get a companion job",
					params: routeJobIdParamsSchema,
					response: {
						200: companionJobSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = jobRepository.getJob(request.params.id);
				if (!job) {
					return reply.status(404).send({ error: "Job not found" });
				}
				return reply.send(job);
			},
		);

		typedServer.post(
			"/jobs/:id/retry-crawl",
			{
				schema: {
					operationId: "retryJobCrawl",
					tags: ["Jobs"],
					summary: "Retry crawling a companion job",
					params: routeJobIdParamsSchema,
					response: {
						200: companionJobSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = jobRepository.resetForRetry(request.params.id, Date.now());
				if (!job) {
					return reply.status(404).send({ error: "Job not found" });
				}
				crawlQueue.enqueue(job.id);
				return reply.send(job);
			},
		);

		typedServer.delete(
			"/jobs/:id",
			{
				schema: {
					operationId: "deleteJob",
					tags: ["Jobs"],
					summary: "Delete a companion job",
					params: routeJobIdParamsSchema,
					response: {
						200: deleteJobResponseSchema,
					},
				},
			},
			async (request) => ({
				deleted: jobRepository.deleteJob(request.params.id),
			}),
		);
	});

	if (options.recoverJobsOnStartup) {
		crawlQueue.enqueueRunnableJobs();
	}

	return server;
}
