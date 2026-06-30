import type { FastifyError } from "fastify";
import fp from "fastify-plugin";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

export const registerErrorHandler = fp(async (server) => {
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
});
