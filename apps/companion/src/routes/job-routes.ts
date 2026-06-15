import { randomUUID } from "node:crypto";
import { existsSync, createReadStream, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
	companionErrorResponseSchema,
	companionJobSchema,
	companionJobsResponseSchema,
	createJobRequestSchema,
	deleteJobResponseSchema,
	jobIdParamsSchema,
} from "../schema.js";
import type { JobRouteContext } from "./context.js";

// Fastify Swagger crashes when a registered component ref is used for params.
const routeJobIdParamsSchema = jobIdParamsSchema.extend({});

export function createJobRoutes(context: JobRouteContext): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

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
				const job = context.jobRepository.createJob({
					id: randomUUID(),
					sourceUrl: request.body.sourceUrl,
					now: Date.now(),
				});
				context.crawlQueue.enqueue(job.id);
				return reply.status(201).send(job);
			},
		);

		typedServer.get(
			"/jobs",
			{
				logLevel: "silent",
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
				jobs: context.jobRepository.listJobs(),
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
				const job = context.jobRepository.getJob(request.params.id);
				if (!job) {
					return reply.status(404).send({ error: "Job not found" });
				}

				return reply.send(job);
			},
		);

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
						404: companionErrorResponseSchema,
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
				const job = context.jobRepository.resetForRetry(
					request.params.id,
					Date.now(),
				);
				if (!job) {
					return reply.status(404).send({ error: "Job not found" });
				}

				context.crawlQueue.enqueue(job.id);
				return reply.send(job);
			},
		);

		typedServer.post(
			"/jobs/:id/retry-analyze",
			{
				schema: {
					operationId: "retryJobAnalysis",
					tags: ["Jobs"],
					summary: "Retry analysis for a companion job",
					params: routeJobIdParamsSchema,
					response: {
						200: companionJobSchema,
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
					return reply.status(404).send({ error: "Job not found" });
				}

				context.crawlQueue.enqueue(job.id);
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
	};
}
