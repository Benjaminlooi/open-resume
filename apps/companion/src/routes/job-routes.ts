import { randomUUID } from "node:crypto";
import { createReadStream, promises as fsPromises } from "node:fs";
import { dirname, join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
	companionErrorResponseSchema,
	jobPostingSchema,
	jobPostingsResponseSchema,
	createJobPostingRequestSchema,
	deleteJobPostingResponseSchema,
	jobApplicationSchema,
	jobIdParamsSchema,
} from "../schema.js";
import type { JobRouteContext } from "./context.js";

// Fastify Swagger crashes when a registered component ref is used for params.
const routeJobIdParamsSchema = jobIdParamsSchema.extend({});

export function createJobRoutes(context: JobRouteContext): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

		typedServer.post(
			"/job-postings",
			{
				schema: {
					operationId: "createJobPosting",
					tags: ["Job Postings"],
					summary: "Create a job posting and enqueue crawling",
					body: createJobPostingRequestSchema,
					response: {
						201: jobPostingSchema,
						400: companionErrorResponseSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = context.jobRepository.createJobPosting({
					id: randomUUID(),
					sourceUrl: request.body.sourceUrl,
					now: Date.now(),
				});
				context.crawlQueue.enqueue(job.id);
				return reply.status(201).send(job);
			},
		);

		typedServer.get(
			"/job-postings",
			{
				logLevel: "silent",
				schema: {
					operationId: "listJobPostings",
					tags: ["Job Postings"],
					summary: "List job postings",
					response: {
						200: jobPostingsResponseSchema,
					},
				},
			},
			async () => ({
				jobPostings: context.jobRepository.listJobPostings(),
			}),
		);

		typedServer.get(
			"/job-postings/:id",
			{
				schema: {
					operationId: "getJobPosting",
					tags: ["Job Postings"],
					summary: "Get a job posting",
					params: routeJobIdParamsSchema,
					response: {
						200: jobPostingSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = context.jobRepository.getJobPosting(request.params.id);
				if (!job) {
					return reply.status(404).send({ error: "Job posting not found" });
				}

				return reply.send(job);
			},
		);

		typedServer.get(
			"/job-postings/:id/screenshot",
			{
				schema: {
					operationId: "getJobPostingScreenshot",
					tags: ["Job Postings"],
					summary: "Get a job posting crawl screenshot",
					params: routeJobIdParamsSchema,
					response: {
						200: z.any().describe("The captured screenshot PNG image."),
						400: companionErrorResponseSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = context.jobRepository.getJobPosting(request.params.id);
				if (!job) {
					return reply.status(404).send({ error: "Job posting not found" });
				}

				const screenshotPath = join(
					context.screenshotsPath,
					`${request.params.id}.png`,
				);
				if (dirname(screenshotPath) !== context.screenshotsPath) {
					return reply.status(400).send({ error: "Invalid ID path" });
				}

				try {
					await fsPromises.access(screenshotPath);
				} catch {
					return reply.status(404).send({ error: "Screenshot not found" });
				}

				const stream = createReadStream(screenshotPath);
				return reply.type("image/png").send(stream);
			},
		);

		typedServer.post(
			"/job-postings/:id/retry-crawl",
			{
				schema: {
					operationId: "retryJobPostingCrawl",
					tags: ["Job Postings"],
					summary: "Retry crawling a job posting",
					params: routeJobIdParamsSchema,
					response: {
						200: jobPostingSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = context.jobRepository.resetForRetry(
					request.params.id,
					Date.now(),
				);
				if (!job) {
					return reply.status(404).send({ error: "Job posting not found" });
				}

				context.crawlQueue.enqueue(job.id);
				return reply.send(job);
			},
		);

		typedServer.post(
			"/job-postings/:id/retry-analyze",
			{
				schema: {
					operationId: "retryJobPostingAnalysis",
					tags: ["Job Postings"],
					summary: "Retry analysis for a job posting",
					params: routeJobIdParamsSchema,
					response: {
						200: jobPostingSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = context.jobRepository.resetForAnalysisRetry(
					request.params.id,
					Date.now(),
				);
				if (!job) {
					return reply.status(404).send({ error: "Job posting not found" });
				}

				context.crawlQueue.enqueue(job.id);
				return reply.send(job);
			},
		);

		typedServer.post(
			"/job-postings/:id/convert",
			{
				schema: {
					operationId: "convertJobToApplication",
					tags: ["Job Postings"],
					summary: "Convert a job posting to a job application",
					params: routeJobIdParamsSchema,
					response: {
						200: jobApplicationSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const id = request.params.id;
				const job = context.jobRepository.getJobPosting(id);
				if (!job) {
					return reply.status(404).send({ error: "Job posting not found" });
				}

				const jobApplication = context.jobRepository.convertJobToApplication(
					id,
					Date.now(),
				);

				const screenshotPath = join(context.screenshotsPath, `${id}.png`);
				if (dirname(screenshotPath) === context.screenshotsPath) {
					try {
						await fsPromises.unlink(screenshotPath);
					} catch {
						// Ignore missing files or permission errors during delete
					}
				}

				return reply.send(jobApplication);
			},
		);

		typedServer.delete(
			"/job-postings/:id",
			{
				schema: {
					operationId: "deleteJobPosting",
					tags: ["Job Postings"],
					summary: "Delete a job posting",
					params: routeJobIdParamsSchema,
					response: {
						200: deleteJobPostingResponseSchema,
					},
				},
			},
			async (request) => {
				const id = request.params.id;
				const deleted = context.jobRepository.deleteJobPosting(id);
				if (deleted) {
					const screenshotPath = join(context.screenshotsPath, `${id}.png`);
					if (dirname(screenshotPath) === context.screenshotsPath) {
						try {
							await fsPromises.unlink(screenshotPath);
						} catch {
							// Ignore missing files or permission errors during delete
						}
					}
				}
				return { deleted };
			},
		);
	};
}
