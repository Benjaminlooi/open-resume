import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
	companionErrorResponseSchema,
	coverLetterDraftSchema,
	jobApplicationSchema,
	jobApplicationStatusSchema,
	jobApplicationsResponseSchema,
	jobFitBriefSchema,
	jobIdParamsSchema,
	resumeContentSchema,
	resumeEditProposalSchema,
} from "../schema.js";
import type { JobApplicationRouteContext } from "./context.js";

// Fastify Swagger crashes when a registered component ref is used for params.
const routeJobIdParamsSchema = jobIdParamsSchema.extend({});

export function createJobApplicationRoutes(
	context: JobApplicationRouteContext,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

		typedServer.get(
			"/job-applications",
			{
				schema: {
					operationId: "listJobApplications",
					tags: ["Job Applications"],
					summary: "List job applications",
					response: {
						200: jobApplicationsResponseSchema,
					},
				},
			},
			async () => ({
				jobApplications: context.jobRepository.listJobApplications(),
			}),
		);

		typedServer.post(
			"/job-applications",
			{
				schema: {
					operationId: "createJobApplication",
					tags: ["Job Applications"],
					summary: "Create a job application",
					body: z
						.object({
							id: z.string().min(1),
							company: z.string(),
							title: z.string(),
							location: z.string(),
							sourceUrl: z.string(),
							description: z.string(),
						})
						.strict(),
					response: {
						201: jobApplicationSchema,
						400: companionErrorResponseSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const jobApplication = context.jobRepository.createJobApplication({
					...request.body,
					now: Date.now(),
				});
				return reply.status(201).send(jobApplication);
			},
		);

		typedServer.get(
			"/job-applications/:id",
			{
				schema: {
					operationId: "getJobApplication",
					tags: ["Job Applications"],
					summary: "Get a job application",
					params: routeJobIdParamsSchema,
					response: {
						200: jobApplicationSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const jobApplication = context.jobRepository.getJobApplication(
					request.params.id,
				);
				if (!jobApplication) {
					return reply.status(404).send({ error: "Job application not found" });
				}
				return reply.send(jobApplication);
			},
		);

		typedServer.put(
			"/job-applications/:id",
			{
				schema: {
					operationId: "updateJobApplication",
					tags: ["Job Applications"],
					summary: "Update a job application",
					params: routeJobIdParamsSchema,
					body: z
						.object({
							company: z.string().min(1).optional(),
							title: z.string().min(1).optional(),
							location: z.string().optional(),
							sourceUrl: z.string().optional(),
							description: z.string().optional(),
							status: jobApplicationStatusSchema.optional(),
							sourceResumeId: z.string().nullable().optional(),
							sourceResumeName: z.string().nullable().optional(),
							sourceResumeSnapshot: resumeContentSchema.nullable().optional(),
							tailoredResume: resumeContentSchema.nullable().optional(),
							fitBrief: jobFitBriefSchema.nullable().optional(),
							resumeEditProposals: z.array(resumeEditProposalSchema).optional(),
							coverLetterDraft: coverLetterDraftSchema.nullable().optional(),
							notes: z.string().optional(),
							followUpAt: z.number().nullable().optional(),
						})
						.strict(),
					response: {
						200: jobApplicationSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const jobApplication = context.jobRepository.updateJobApplication(
					request.params.id,
					{
						...request.body,
						now: Date.now(),
					},
				);
				if (!jobApplication) {
					return reply.status(404).send({ error: "Job application not found" });
				}
				return reply.send(jobApplication);
			},
		);

		typedServer.delete(
			"/job-applications/:id",
			{
				schema: {
					operationId: "deleteJobApplication",
					tags: ["Job Applications"],
					summary: "Delete a job application",
					params: routeJobIdParamsSchema,
					response: {
						200: z.object({ deleted: z.boolean() }).strict(),
					},
				},
			},
			async (request) => ({
				deleted: context.jobRepository.deleteJobApplication(request.params.id),
			}),
		);
	};
}
