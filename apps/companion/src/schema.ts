import { z } from "zod";

const httpUrlSchema = z
	.string()
	.url()
	.refine((value) => {
		try {
			const url = new URL(value);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}, "URL must use http or https");

export const extractJobRequestSchema = z
	.object({
		url: httpUrlSchema.describe("HTTP or HTTPS job posting URL to extract."),
	})
	.strict();

export type ExtractJobRequest = z.infer<typeof extractJobRequestSchema>;

export const healthResponseSchema = z
	.object({
		ok: z.boolean(),
		service: z.string(),
	})
	.strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const extractionMethodSchema = z.enum([
	"json-ld",
	"readability",
	"playwright",
]);

export const jobExtractionResultSchema = z
	.object({
		sourceUrl: httpUrlSchema,
		title: z.string(),
		company: z.string(),
		location: z.string(),
		description: z.string(),
		rawText: z.string(),
		extractionMethod: extractionMethodSchema,
		extractedAt: z.number().describe("Unix timestamp in milliseconds."),
	})
	.strict();

export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

export const companionErrorResponseSchema = z
	.object({
		error: z.string(),
		details: z.string().optional(),
	})
	.strict();

export type CompanionErrorResponse = z.infer<
	typeof companionErrorResponseSchema
>;

export const crawlStatusSchema = z.enum([
	"pending",
	"crawling",
	"ready",
	"failed",
]);

export type CrawlStatus = z.infer<typeof crawlStatusSchema>;

export const createJobRequestSchema = z
	.object({
		sourceUrl: httpUrlSchema.describe("HTTP or HTTPS job posting URL to crawl."),
	})
	.strict();

export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;

export const jobIdParamsSchema = z
	.object({
		id: z.string().min(1),
	})
	.strict();

export type JobIdParams = z.infer<typeof jobIdParamsSchema>;

export const companionJobSchema = z
	.object({
		id: z.string(),
		sourceUrl: httpUrlSchema,
		crawlStatus: crawlStatusSchema,
		crawlError: z.string().nullable(),
		cleanedText: z.string(),
		createdAt: z.number().describe("Unix timestamp in milliseconds."),
		updatedAt: z.number().describe("Unix timestamp in milliseconds."),
		crawledAt: z
			.number()
			.nullable()
			.describe("Unix timestamp in milliseconds, or null before crawl success."),
	})
	.strict();

export type CompanionJob = z.infer<typeof companionJobSchema>;

export const companionJobsResponseSchema = z
	.object({
		jobs: z.array(companionJobSchema),
	})
	.strict();

export type CompanionJobsResponse = z.infer<
	typeof companionJobsResponseSchema
>;

export const deleteJobResponseSchema = z
	.object({
		deleted: z.boolean(),
	})
	.strict();

export type DeleteJobResponse = z.infer<typeof deleteJobResponseSchema>;

z.globalRegistry.add(healthResponseSchema, { id: "HealthResponse" });
z.globalRegistry.add(extractJobRequestSchema, { id: "ExtractJobRequest" });
z.globalRegistry.add(jobExtractionResultSchema, { id: "JobExtractionResult" });
z.globalRegistry.add(companionErrorResponseSchema, {
	id: "CompanionErrorResponse",
});
z.globalRegistry.add(createJobRequestSchema, { id: "CreateJobRequest" });
z.globalRegistry.add(jobIdParamsSchema, { id: "JobIdParams" });
z.globalRegistry.add(companionJobSchema, { id: "CompanionJob" });
z.globalRegistry.add(companionJobsResponseSchema, {
	id: "CompanionJobsResponse",
});
z.globalRegistry.add(deleteJobResponseSchema, { id: "DeleteJobResponse" });
