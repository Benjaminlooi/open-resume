import cors from "@fastify/cors";
import Fastify from "fastify";
import { extractReadableText } from "./extract/html.js";
import { extractJobPostingJsonLd } from "./extract/json-ld.js";
import { normalizeExtraction } from "./extract/normalize.js";
import { extractWithPlaywright } from "./extract/playwright.js";
import { extractJobRequestSchema } from "./schema.js";

export function createServer() {
	const server = Fastify({
		logger: false,
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
			return reply.status(400).send({
				error: "Invalid extraction request",
				details: parsed.error.message,
			});
		}

		const response = await fetch(parsed.data.url, {
			headers: {
				"user-agent":
					"OpenResumeCompanion/0.1 (+https://github.com/Benjaminlooi/resume-builder)",
				accept: "text/html,application/xhtml+xml",
			},
		});

		if (!response.ok) {
			const result = await extractWithPlaywright(parsed.data.url);
			return reply.send(result);
		}

		const html = await response.text();
		const rawText = extractReadableText(html);
		const structured = extractJobPostingJsonLd(html);
		const result = normalizeExtraction({
			sourceUrl: parsed.data.url,
			rawText,
			method: structured ? "json-ld" : "readability",
			structured,
		});

		if (!result.description || result.description.length < 160) {
			const playwrightResult = await extractWithPlaywright(parsed.data.url);
			return reply.send(playwrightResult);
		}

		return reply.send(result);
	});

	return server;
}
