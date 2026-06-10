import cors from "@fastify/cors";
import Fastify from "fastify";
import type { FastifyError } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { extractWithPlaywright } from "./extract/playwright.js";
import { registerOpenApi } from "./openapi.js";
import {
	companionErrorResponseSchema,
	extractJobRequestSchema,
	healthResponseSchema,
	jobExtractionResultSchema,
} from "./schema.js";

interface LogStream {
	write(message: string): void;
}

interface CreateServerOptions {
	logLevel?: string;
	logScrapedData?: boolean;
	logStream?: LogStream;
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

	registerOpenApi(server);

	server.setErrorHandler((err: FastifyError, request, reply) => {
		if (hasZodFastifySchemaValidationErrors(err)) {
			request.log.warn(
				{ details: JSON.stringify(err.validation) },
				"invalid extraction request",
			);
			return reply.status(400).send({
				error: "Invalid extraction request",
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
			"/openapi.json",
			{
				schema: {
					hide: true,
				},
			},
			async () => server.swagger(),
		);

		typedServer.post(
			"/extract-job",
			{
				schema: {
					operationId: "extractJob",
					tags: ["Extraction"],
					summary: "Extract job details from a URL",
					body: extractJobRequestSchema,
					response: {
						200: jobExtractionResultSchema,
						400: companionErrorResponseSchema,
						500: companionErrorResponseSchema,
						502: companionErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				request.log.info({ url: request.body.url }, "extract job started");
				try {
					const result = await extractWithPlaywright(request.body.url, {
						logger: request.log,
						logScrapedData,
					});
					request.log.info(
						{
							method: result.extractionMethod,
							descriptionLength: result.description.length,
						},
						"extracted job details",
					);
					return reply.send(result);
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : String(err);
					request.log.error(
						{ url: request.body.url, error: errorMessage },
						"failed to extract job with playwright",
					);
					return reply.status(502).send({
						error: "Failed to extract job details",
						details: errorMessage,
					});
				}
			},
		);
	});

	return server;
}
