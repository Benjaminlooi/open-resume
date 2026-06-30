import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthResponseSchema } from "../schema.js";

export function createSystemRoutes(): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

		typedServer.get(
			"/health",
			{
				schema: {
					operationId: "getHealth",
					tags: ["System"],
					summary: "Check backend health",
					response: {
						200: healthResponseSchema,
					},
				},
			},
			async () => ({
				ok: true,
				service: "open-resume-backend",
			}),
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
	};
}
