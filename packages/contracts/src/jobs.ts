import { z } from "zod";
import { httpUrlSchema } from "./common.js";

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

export const crawlStatusSchema = z.enum([
	"pending",
	"crawling",
	"analyzing",
	"ready",
	"failed",
]);

export type CrawlStatus = z.infer<typeof crawlStatusSchema>;

export const createJobRequestSchema = z
	.object({
		sourceUrl: httpUrlSchema.describe(
			"HTTP or HTTPS job posting URL to crawl.",
		),
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
		id: z.string().min(1),
		sourceUrl: httpUrlSchema,
		crawlStatus: crawlStatusSchema,
		crawlError: z.string().nullable(),
		cleanedText: z.string(),
		createdAt: z.number().describe("Unix timestamp in milliseconds."),
		updatedAt: z.number().describe("Unix timestamp in milliseconds."),
		crawledAt: z
			.number()
			.nullable()
			.describe(
				"Unix timestamp in milliseconds, or null before crawl success.",
			),
		parsedTitle: z.string().nullable().optional(),
		parsedCompany: z.string().nullable().optional(),
		parsedLocation: z.string().nullable().optional(),
		parsedDescription: z.string().nullable().optional(),
		fitScore: z.number().nullable().optional(),
		fitBriefJson: z.string().nullable().optional(),
	})
	.strict();

export type CompanionJob = z.infer<typeof companionJobSchema>;

export const companionJobsResponseSchema = z
	.object({
		jobs: z.array(companionJobSchema),
	})
	.strict();

export type CompanionJobsResponse = z.infer<typeof companionJobsResponseSchema>;

export const deleteJobResponseSchema = z
	.object({
		deleted: z.boolean(),
	})
	.strict();

export type DeleteJobResponse = z.infer<typeof deleteJobResponseSchema>;

export const jobFitBriefSchema = z
	.object({
		roleSummary: z.string(),
		requirements: z.array(z.string()),
		keywords: z.array(z.string()),
		strengths: z.array(z.string()),
		gaps: z.array(z.string()),
		risks: z.array(z.string()),
		nextActions: z.array(z.string()),
		generatedAt: z.number(),
	})
	.strict();

export type JobFitBrief = z.infer<typeof jobFitBriefSchema>;
