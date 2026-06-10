import cors from "@fastify/cors";
import Fastify from "fastify";
import { extractReadableText } from "./extract/html.js";
import { extractJobPostingJsonLd } from "./extract/json-ld.js";
import { normalizeExtraction } from "./extract/normalize.js";
import { extractWithPlaywright } from "./extract/playwright.js";
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
	const logLevel = options.logLevel ?? process.env.OPEN_RESUME_COMPANION_LOG_LEVEL;

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

	server.register(cors, {
		origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
	});

	server.get("/health", async () => ({
		ok: true,
		service: "open-resume-companion",
	}));

	server.post("/extract-job", async (request, reply) => {
		const parsed = extractJobRequestSchema.safeParse(request.body);

		if (!parsed.success) {
			request.log.warn({ details: parsed.error.message }, "invalid extraction request");
			return reply.status(400).send({
				error: "Invalid extraction request",
				details: parsed.error.message,
			});
		}

		request.log.info({ url: parsed.data.url }, "extract job started");
		const response = await fetch(parsed.data.url, {
			headers: {
				"user-agent":
					"OpenResumeCompanion/0.1 (+https://github.com/Benjaminlooi/resume-builder)",
				accept: "text/html,application/xhtml+xml",
			},
		});
		request.log.debug(
			{
				status: response.status,
				contentType: response.headers.get("content-type"),
			},
			"fetched job URL",
		);

		if (!response.ok) {
			request.log.info(
				{ status: response.status },
				"falling back to playwright after fetch failure",
			);
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
		}

		const html = await response.text();
		const rawText = extractReadableText(html);
		const structured = extractJobPostingJsonLd(html);
		if (logScrapedData) {
			request.log.debug(
				{ url: parsed.data.url, rawText, structured },
				"scraped data before normalization",
			);
		}
		const result = normalizeExtraction({
			sourceUrl: parsed.data.url,
			rawText,
			method: structured ? "json-ld" : "readability",
			structured,
		});
		if (logScrapedData) {
			request.log.debug(
				{ url: parsed.data.url, result },
				"scraped data after normalization",
			);
		}

		if (!result.description || result.description.length < 160) {
			request.log.info(
				{ descriptionLength: result.description.length },
				"falling back to playwright after short extraction",
			);
			const playwrightResult = await extractWithPlaywright(parsed.data.url, {
				logger: request.log,
				logScrapedData,
			});
			request.log.info(
				{
					method: playwrightResult.extractionMethod,
					descriptionLength: playwrightResult.description.length,
				},
				"extracted job details",
			);
			return reply.send(playwrightResult);
		}

		request.log.info(
			{
				method: result.extractionMethod,
				descriptionLength: result.description.length,
				hasStructuredData: Boolean(structured),
			},
			"extracted job details",
		);
		return reply.send(result);
	});

	return server;
}
