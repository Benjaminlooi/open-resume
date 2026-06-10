import { afterEach, describe, expect, it, vi } from "vitest";
import { extractWithPlaywright } from "./extract/playwright.js";
import { createServer } from "./server.js";

vi.mock("./extract/playwright.js", () => ({
	extractWithPlaywright: vi.fn(),
}));

function parseJsonLogs(output: string) {
	return output
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

describe("companion server", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
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

	it("rejects completely invalid URLs with 400 bad request", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "POST",
			url: "/extract-job",
			payload: { url: "string" },
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

	it("extracts job details via playwright and logs scraped data when enabled", async () => {
		let logOutput = "";
		const mockResult = {
			sourceUrl: "https://example.com/jobs/1",
			title: "Senior Engineer",
			company: "Acme Inc",
			location: "",
			description: "Build reliable hiring systems...",
			rawText: "Build reliable hiring systems...",
			extractionMethod: "playwright" as const,
			extractedAt: Date.now(),
		};

		vi.mocked(extractWithPlaywright).mockImplementationOnce(
			async (url, options) => {
				options?.logger?.debug(
					{ url, rawText: mockResult.rawText, structured: null },
					"scraped data before normalization",
				);
				options?.logger?.debug(
					{ url, result: mockResult },
					"scraped data after normalization",
				);
				return mockResult;
			},
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
		expect(response.json()).toEqual(mockResult);
		expect(extractWithPlaywright).toHaveBeenCalledWith(
			"https://example.com/jobs/1",
			expect.any(Object),
		);

		const logs = parseJsonLogs(logOutput);
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 20,
					msg: "scraped data before normalization",
					rawText: "Build reliable hiring systems...",
					structured: null,
				}),
				expect.objectContaining({
					level: 20,
					msg: "scraped data after normalization",
					result: expect.objectContaining({
						sourceUrl: "https://example.com/jobs/1",
						description: "Build reliable hiring systems...",
						extractionMethod: "playwright",
					}),
				}),
			]),
		);
	});

	it("returns 502 Bad Gateway when playwright extraction throws an error", async () => {
		vi.mocked(extractWithPlaywright).mockRejectedValueOnce(
			new Error("Playwright crashed"),
		);

		const server = createServer();
		const response = await server.inject({
			method: "POST",
			url: "/extract-job",
			payload: { url: "https://example.com/jobs/fail" },
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toEqual({
			error: "Failed to extract job details",
			details: "Playwright crashed",
		});
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
		expect(
			document.components.schemas.ExtractJobRequest.properties.url,
		).toMatchObject({
			type: "string",
			format: "uri",
			description: "HTTP or HTTPS job posting URL to extract.",
		});
		expect(
			document.components.schemas.JobExtractionResult.properties.extractedAt,
		).toMatchObject({
			type: "number",
			description: "Unix timestamp in milliseconds.",
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
