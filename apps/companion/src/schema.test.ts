import { describe, expect, it } from "vitest";
import {
	extractJobRequestSchema,
	jobExtractionResultSchema,
} from "./schema.js";

describe("companion schema", () => {
	it("accepts a valid extraction request", () => {
		const parsed = extractJobRequestSchema.parse({
			url: "https://example.com/jobs/123",
		});

		expect(parsed.url).toBe("https://example.com/jobs/123");
	});

	it("rejects non-http URLs", () => {
		expect(() =>
			extractJobRequestSchema.parse({ url: "file:///etc/passwd" }),
		).toThrow();
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
});
