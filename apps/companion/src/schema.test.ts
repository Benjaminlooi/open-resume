import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import {
	companionJobSchema,
	companionJobsResponseSchema,
	createJobRequestSchema,
	crawlStatusSchema,
	deleteJobResponseSchema,
	extractJobRequestSchema,
	healthResponseSchema,
	jobIdParamsSchema,
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

	it("accepts a companion job with pending crawl state", () => {
		const parsed = companionJobSchema.parse({
			id: "job-1",
			sourceUrl: "https://example.com/jobs/1",
			crawlStatus: "pending",
			crawlError: null,
			cleanedText: "",
			createdAt: 1791571200000,
			updatedAt: 1791571200000,
			crawledAt: null,
		});

		expect(parsed.crawlStatus).toBe("pending");
	});

	it("rejects companion jobs with empty IDs", () => {
		expect(() =>
			companionJobSchema.parse({
				id: "",
				sourceUrl: "https://example.com/jobs/1",
				crawlStatus: "pending",
				crawlError: null,
				cleanedText: "",
				createdAt: 1791571200000,
				updatedAt: 1791571200000,
				crawledAt: null,
			}),
		).toThrow(ZodError);
	});

	it("rejects create job requests with non-http URLs", () => {
		expect(() => createJobRequestSchema.parse({ sourceUrl: "file:///tmp/a" }))
			.toThrow(ZodError);
	});

	it("accepts job route params and delete responses", () => {
		expect(jobIdParamsSchema.parse({ id: "job-1" })).toEqual({ id: "job-1" });
		expect(deleteJobResponseSchema.parse({ deleted: true })).toEqual({
			deleted: true,
		});
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

	it("registers job schemas for OpenAPI component generation", () => {
		expect(z.globalRegistry.get(crawlStatusSchema)?.id).toBe("CrawlStatus");
		expect(z.globalRegistry.get(createJobRequestSchema)?.id).toBe(
			"CreateJobRequest",
		);
		expect(z.globalRegistry.get(jobIdParamsSchema)?.id).toBe("JobIdParams");
		expect(z.globalRegistry.get(companionJobSchema)?.id).toBe("CompanionJob");
		expect(z.globalRegistry.get(companionJobsResponseSchema)?.id).toBe(
			"CompanionJobsResponse",
		);
		expect(z.globalRegistry.get(deleteJobResponseSchema)?.id).toBe(
			"DeleteJobResponse",
		);
	});
});
