import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "./server.js";

const originalFetch = globalThis.fetch;

function parseJsonLogs(output: string) {
	return output
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

describe("companion server", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("responds to health checks", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "GET",
			url: "/health",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			ok: true,
			service: "open-resume-companion",
		});
	});

	it("rejects invalid extraction requests", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "POST",
			url: "/extract-job",
			payload: { url: "file:///etc/passwd" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			error: "Invalid extraction request",
		});
	});

	it("logs request details when logging is enabled", async () => {
		let logOutput = "";
		const server = createServer({
			logLevel: "debug",
			logStream: {
				write(message: string) {
					logOutput += message;
				},
			},
		});

		const response = await server.inject({
			method: "GET",
			url: "/health",
		});

		expect(response.statusCode).toBe(200);
		const logs = parseJsonLogs(logOutput);
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 30,
					msg: "incoming request",
				}),
				expect.objectContaining({
					level: 30,
					msg: "request completed",
				}),
			]),
		);
	});

	it("logs scraped data before and after normalization when enabled", async () => {
		let logOutput = "";
		globalThis.fetch = vi.fn().mockResolvedValue(
			new Response(
				[
					"<html><body>",
					"<h1>Senior Engineer</h1>",
					"<p>Acme Inc</p>",
					"<p>Build reliable hiring systems with observability and care. Lead backend improvements, improve job ingestion quality, and help teams understand whether scraped content is complete enough for tailoring workflows.</p>",
					"</body></html>",
				].join(""),
				{
					status: 200,
					headers: { "content-type": "text/html" },
				},
			),
		);
		const server = createServer({
			logLevel: "debug",
			logScrapedData: true,
			logStream: {
				write(message: string) {
					logOutput += message;
				},
			},
		});

		const response = await server.inject({
			method: "POST",
			url: "/extract-job",
			payload: { url: "https://example.com/jobs/1" },
		});

		expect(response.statusCode).toBe(200);
		const logs = parseJsonLogs(logOutput);
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 20,
					msg: "scraped data before normalization",
					rawText:
						"Senior Engineer Acme Inc Build reliable hiring systems with observability and care. Lead backend improvements, improve job ingestion quality, and help teams understand whether scraped content is complete enough for tailoring workflows.",
					structured: null,
				}),
				expect.objectContaining({
					level: 20,
					msg: "scraped data after normalization",
					result: expect.objectContaining({
						sourceUrl: "https://example.com/jobs/1",
						description:
							"Senior Engineer Acme Inc Build reliable hiring systems with observability and care. Lead backend improvements, improve job ingestion quality, and help teams understand whether scraped content is complete enough for tailoring workflows.",
						extractionMethod: "readability",
					}),
				}),
			]),
		);
	});

	it("serves an OpenAPI document with companion route contracts", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "GET",
			url: "/openapi.json",
		});

		expect(response.statusCode).toBe(200);
		const document = response.json();
		expect(document.openapi).toBe("3.0.3");
		expect(document.info).toMatchObject({
			title: "Open Resume Companion API",
			version: "0.1.0",
		});
		expect(document.paths["/health"].get).toMatchObject({
			operationId: "getHealth",
			tags: ["System"],
		});
		expect(document.paths["/extract-job"].post).toMatchObject({
			operationId: "extractJob",
			tags: ["Extraction"],
		});
		expect(document.components.schemas).toMatchObject({
			ExtractJobRequest: expect.any(Object),
			JobExtractionResult: expect.any(Object),
			CompanionErrorResponse: expect.any(Object),
			HealthResponse: expect.any(Object),
		});
		expect(document.paths["/openapi.json"]).toBeUndefined();
	});

	it("serves Swagger UI for manual API exploration", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "GET",
			url: "/docs",
		});

		expect([200, 301, 302]).toContain(response.statusCode);
	});
});
