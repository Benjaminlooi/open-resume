import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	aiConfigResponseSchema,
	updateAiConfigRequestSchema,
	updateAiConfigResponseSchema,
} from "@open-resume/contracts";
import {
	getAIConfig,
	setAIConfig,
	saveAIConfigToFile,
	maskApiKey,
} from "../config-store.js";

interface AIConfigRouteOptions {
	aiConfigPath: string;
}

export function createAIConfigRoutes(
	options: AIConfigRouteOptions,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

		typedServer.get(
			"/ai/config",
			{
				schema: {
					operationId: "getAIConfig",
					tags: ["AI"],
					summary: "Get AI Configuration",
					response: {
						200: aiConfigResponseSchema,
					},
				},
			},
			async () => {
				const config = getAIConfig();
				return {
					provider: config.provider,
					apiKeyMasked: maskApiKey(config.apiKey),
					modelName: config.modelName,
					baseUrl: config.baseUrl,
					hasApiKey: config.apiKey.length > 0,
				};
			},
		);

		typedServer.put(
			"/ai/config",
			{
				schema: {
					operationId: "updateAIConfig",
					tags: ["AI"],
					summary: "Update AI Configuration",
					body: updateAiConfigRequestSchema,
					response: {
						200: updateAiConfigResponseSchema,
					},
				},
			},
			async (request) => {
				const current = getAIConfig();
				const updated = {
					provider: request.body.provider ?? current.provider,
					// Only update apiKey if a non-empty value is provided
					apiKey:
						request.body.apiKey !== undefined && request.body.apiKey !== ""
							? request.body.apiKey
							: current.apiKey,
					modelName: request.body.modelName ?? current.modelName,
					baseUrl: request.body.baseUrl ?? current.baseUrl,
				};
				setAIConfig(updated);
				saveAIConfigToFile(options.aiConfigPath, updated);
				return {
					provider: updated.provider,
					apiKeyMasked: maskApiKey(updated.apiKey),
					modelName: updated.modelName,
					baseUrl: updated.baseUrl,
					hasApiKey: updated.apiKey.length > 0,
				};
			},
		);
	};
}
