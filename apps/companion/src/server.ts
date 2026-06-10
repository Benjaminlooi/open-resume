import cors from "@fastify/cors";
import Fastify from "fastify";
import { extractWithPlaywright } from "./extract/playwright.js";
import { registerOpenApi } from "./openapi.js";
import { extractJobRequestSchema } from "./schema.js";

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

	registerOpenApi(server);

	server.register(cors, {
		origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
	});

	server.after(() => {
		server.get(
			"/health",
			{
				schema: {
					operationId: "getHealth",
					tags: ["System"],
					summary: "Check companion health",
					response: {
						200: { $ref: "HealthResponse#" },
					},
				},
			},
			async () => ({
				ok: true,
				service: "open-resume-companion",
			}),
		);

		server.get(
			"/openapi.json",
			{
				schema: {
					hide: true,
				},
			},
			async () => server.swagger(),
		);

		server.post(
			"/extract-job",
			{
				schema: {
					operationId: "extractJob",
					tags: ["Extraction"],
					summary: "Extract job details from a URL",
					body: { $ref: "ExtractJobRequest#" },
					response: {
						200: { $ref: "JobExtractionResult#" },
						400: { $ref: "CompanionErrorResponse#" },
						500: { $ref: "CompanionErrorResponse#" },
						502: { $ref: "CompanionErrorResponse#" },
					},
				},
			},
			async (request, reply) => {
				const parsed = extractJobRequestSchema.safeParse(request.body);

				if (!parsed.success) {
					request.log.warn(
						{ details: parsed.error.message },
						"invalid extraction request",
					);
					return reply.status(400).send({
						error: "Invalid extraction request",
						details: parsed.error.message,
					});
				}

				request.log.info({ url: parsed.data.url }, "extract job started");
				try {
					const result = await extractWithPlaywright(parsed.data.url, {
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
						{ url: parsed.data.url, error: errorMessage },
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
