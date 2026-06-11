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

export const targetRoleArchetypeSchema = z
	.object({
		name: z.string(),
		level: z.string(),
		fit: z.enum(["primary", "secondary", "adjacent"]),
	})
	.strict();

export type TargetRoleArchetype = z.infer<typeof targetRoleArchetypeSchema>;

export const candidateProfileSchema = z
	.object({
		candidate: z
			.object({
				fullName: z.string(),
				email: z.string(),
				phone: z.string(),
				location: z.string(),
				linkedin: z.string(),
				portfolioUrl: z.string(),
				github: z.string(),
				twitter: z.string().optional(),
			})
			.strict(),
		targetRoles: z
			.object({
				primary: z.array(z.string()),
				archetypes: z.array(targetRoleArchetypeSchema),
			})
			.strict(),
		narrative: z
			.object({
				headline: z.string(),
				exitStory: z.string(),
				superpowers: z.array(z.string()),
				proofPoints: z.array(
					z
						.object({
							name: z.string(),
							url: z.string(),
							heroMetric: z.string(),
						})
						.strict(),
				),
			})
			.strict(),
		compensation: z
			.object({
				targetRange: z.string(),
				currency: z.string(),
				minimum: z.string(),
				preferred: z.string(),
				locationFlexibility: z.string(),
			})
			.strict(),
		location: z
			.object({
				country: z.string(),
				city: z.string(),
				timezone: z.string(),
				visaStatus: z.string(),
				onsiteAvailability: z.string(),
				remotePolicy: z.string(),
			})
			.strict(),
	})
	.strict();

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export const resumeSyncRequestSchema = z
	.object({
		resume: z.record(z.string(), z.unknown()),
	})
	.strict();

export type ResumeSyncRequest = z.infer<typeof resumeSyncRequestSchema>;

export const okResponseSchema = z
	.object({
		ok: z.boolean(),
	})
	.strict();

export type OkResponse = z.infer<typeof okResponseSchema>;

export const syncedResumeResponseSchema = z.record(z.string(), z.unknown());

z.globalRegistry.add(healthResponseSchema, { id: "HealthResponse" });
z.globalRegistry.add(extractJobRequestSchema, { id: "ExtractJobRequest" });
z.globalRegistry.add(jobExtractionResultSchema, { id: "JobExtractionResult" });
z.globalRegistry.add(companionErrorResponseSchema, {
	id: "CompanionErrorResponse",
});
z.globalRegistry.add(crawlStatusSchema, { id: "CrawlStatus" });
z.globalRegistry.add(createJobRequestSchema, { id: "CreateJobRequest" });
z.globalRegistry.add(jobIdParamsSchema, { id: "JobIdParams" });
z.globalRegistry.add(companionJobSchema, { id: "CompanionJob" });
z.globalRegistry.add(companionJobsResponseSchema, {
	id: "CompanionJobsResponse",
});
z.globalRegistry.add(deleteJobResponseSchema, { id: "DeleteJobResponse" });
z.globalRegistry.add(candidateProfileSchema, { id: "CandidateProfile" });
z.globalRegistry.add(resumeSyncRequestSchema, { id: "ResumeSyncRequest" });
z.globalRegistry.add(okResponseSchema, { id: "OkResponse" });
