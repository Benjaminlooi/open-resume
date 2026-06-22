import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	companionErrorResponseSchema,
	createResumeRequestSchema,
	deleteResumeResponseSchema,
	jobIdParamsSchema,
	okResponseSchema,
	resumeDetailsSchema,
	resumesResponseSchema,
	updateResumeRequestSchema,
} from "../schema.js";
import type { ResumeRouteContext } from "./context.js";

// Fastify Swagger crashes when a registered component ref is used for params.
const routeResumeIdParamsSchema = jobIdParamsSchema.extend({});

export function createResumeRoutes(
	context: ResumeRouteContext,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

		typedServer.get(
			"/resumes",
			{
				schema: {
					operationId: "listResumes",
					tags: ["Resumes"],
					summary: "List saved resumes",
					response: {
						200: resumesResponseSchema,
					},
				},
			},
			async () => ({
				resumes: context.jobRepository.listResumes(),
			}),
		);

		typedServer.post(
			"/resumes",
			{
				schema: {
					operationId: "createResume",
					tags: ["Resumes"],
					summary: "Create a saved resume",
					body: createResumeRequestSchema,
					response: {
						201: resumeDetailsSchema,
						400: companionErrorResponseSchema,
						500: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = context.jobRepository.createResume({
					...request.body,
					now: Date.now(),
				});
				return reply.status(201).send(resume);
			},
		);

		typedServer.get(
			"/resumes/:id",
			{
				schema: {
					operationId: "getResume",
					tags: ["Resumes"],
					summary: "Get a saved resume",
					params: routeResumeIdParamsSchema,
					response: {
						200: resumeDetailsSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = context.jobRepository.getResume(request.params.id);
				if (!resume) {
					return reply.status(404).send({ error: "Resume not found" });
				}

				return reply.send(resume);
			},
		);

		typedServer.put(
			"/resumes/:id",
			{
				schema: {
					operationId: "updateResume",
					tags: ["Resumes"],
					summary: "Update a saved resume",
					params: routeResumeIdParamsSchema,
					body: updateResumeRequestSchema,
					response: {
						200: resumeDetailsSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = context.jobRepository.updateResume(request.params.id, {
					...request.body,
					now: Date.now(),
				});
				if (!resume) {
					return reply.status(404).send({ error: "Resume not found" });
				}

				return reply.send(resume);
			},
		);

		typedServer.put(
			"/resumes/:id/default",
			{
				schema: {
					operationId: "setDefaultResume",
					tags: ["Resumes"],
					summary: "Set the default resume",
					params: routeResumeIdParamsSchema,
					response: {
						200: resumeDetailsSchema,
						404: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = context.jobRepository.setDefaultResume(
					request.params.id,
					Date.now(),
				);
				if (!resume) {
					return reply.status(404).send({ error: "Resume not found" });
				}

				return reply.send(resume);
			},
		);

		typedServer.delete(
			"/resumes/default",
			{
				schema: {
					operationId: "clearDefaultResume",
					tags: ["Resumes"],
					summary: "Clear the default resume",
					response: {
						200: okResponseSchema,
					},
				},
			},
			async () => {
				context.jobRepository.clearDefaultResume(Date.now());
				return { ok: true };
			},
		);

		typedServer.delete(
			"/resumes/:id",
			{
				schema: {
					operationId: "deleteResume",
					tags: ["Resumes"],
					summary: "Delete a saved resume",
					params: routeResumeIdParamsSchema,
					response: {
						200: deleteResumeResponseSchema,
					},
				},
			},
			async (request) => ({
				deleted: context.jobRepository.deleteResume(request.params.id),
			}),
		);
	};
}
