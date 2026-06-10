import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import {
	extractJobRequestSchema,
	healthResponseSchema,
	jobExtractionResultSchema,
} from "./schema.js";

describe("companion schema", () => {
	it("accepts a valid health response", () => {
		const parsed = healthResponseSchema.parse({
			ok: true,
			service: "companion",
		});

		expect(parsed).toEqual({
			ok: true,
			service: "companion",
		});
	});

	it("rejects invalid health responses", () => {
		expect(() =>
			healthResponseSchema.parse({
				ok: "true",
				service: "companion",
			}),
		).toThrow(ZodError);
	});

	it("accepts a valid extraction request", () => {
		const parsed = extractJobRequestSchema.parse({
			url: "https://example.com/jobs/123",
		});

		expect(parsed.url).toBe("https://example.com/jobs/123");
	});

	it("rejects non-http URLs", () => {
		expect(() =>
			extractJobRequestSchema.parse({ url: "file:///etc/passwd" }),
		).toThrow(ZodError);
	});

	it("rejects completely invalid URLs like 'string'", () => {
		expect(() => extractJobRequestSchema.parse({ url: "string" })).toThrow(
			ZodError,
		);
	});

	it("accepts a normalized extraction result", () => {
		const parsed = jobExtractionResultSchema.parse({
			sourceUrl: "https://example.com/jobs/123",
			title: "Software Engineer",
			company: "Example Inc",
			location: "Remote",
			description: "Build useful software.",
			rawText: "Software Engineer at Example Inc. Build useful software.",
			extractionMethod: "json-ld",
			extractedAt: 1791571200000,
		});

		expect(parsed.extractionMethod).toBe("json-ld");
	});

	it("registers named API schemas", () => {
		expect(z.globalRegistry.get(healthResponseSchema)?.id).toBe(
			"HealthResponse",
		);
		expect(z.globalRegistry.get(extractJobRequestSchema)?.id).toBe(
			"ExtractJobRequest",
		);
		expect(z.globalRegistry.get(jobExtractionResultSchema)?.id).toBe(
			"JobExtractionResult",
		);
	});
});
