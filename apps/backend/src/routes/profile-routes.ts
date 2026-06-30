import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { defaultProfile } from "../profile/default-profile.js";
import {
	candidateProfileSchema,
	backendErrorResponseSchema,
	okResponseSchema,
	resumeSyncRequestSchema,
	syncedResumeResponseSchema,
} from "../schema.js";
import type { ProfileRouteContext } from "./context.js";

const profileResumeId = "profile-resume";

export function createProfileRoutes(
	context: ProfileRouteContext,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

		typedServer.get(
			"/profile",
			{
				schema: {
					operationId: "getProfile",
					tags: ["Profile"],
					summary: "Get candidate profile",
					response: {
						200: candidateProfileSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async () => {
				const profilePath = context.getProfilePath();
				if (!existsSync(profilePath)) {
					const profile = structuredClone(defaultProfile);
					mkdirSync(dirname(profilePath), { recursive: true });
					writeFileSync(profilePath, JSON.stringify(profile, null, 2));
					return profile;
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
						500: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const profilePath = context.getProfilePath();
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
						404: backendErrorResponseSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async (_request, reply) => {
				const defaultResume = context.jobRepository.getDefaultResume();
				if (!defaultResume) {
					return reply.status(404).send({ error: "Synced resume not found" });
				}

				return defaultResume.content;
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
						500: backendErrorResponseSchema,
					},
				},
			},
			async (request) => {
				const now = Date.now();
				const existingResume = context.jobRepository.getResume(profileResumeId);

				if (existingResume) {
					context.jobRepository.updateResume(profileResumeId, {
						content: request.body.resume,
						now,
					});
				} else {
					context.jobRepository.createResume({
						id: profileResumeId,
						name: "Profile Resume",
						templateId: "default",
						content: request.body.resume,
						now,
					});
				}

				context.jobRepository.setDefaultResume(profileResumeId, now);
				return { ok: true };
			},
		);
	};
}
