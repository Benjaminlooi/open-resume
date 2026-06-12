import { z } from "zod";
import { companionErrorResponseSchema, okResponseSchema } from "./common.js";
import {
	companionJobSchema,
	companionJobsResponseSchema,
	crawlStatusSchema,
	createJobRequestSchema,
	deleteJobResponseSchema,
	extractJobRequestSchema,
	healthResponseSchema,
	jobExtractionResultSchema,
	jobFitBriefSchema,
	jobIdParamsSchema,
} from "./jobs.js";
import { candidateProfileSchema } from "./profiles.js";
import {
	createResumeRequestSchema,
	deleteResumeResponseSchema,
	resumeContentSchema,
	resumeDetailsSchema,
	resumeSummarySchema,
	resumeSyncRequestSchema,
	resumesResponseSchema,
	updateResumeRequestSchema,
} from "./resumes.js";

// Re-export modules
export * from "./common.js";
export * from "./jobs.js";
export * from "./profiles.js";
export * from "./resumes.js";

// Register schemas globally for fastify-type-provider-zod swagger generators if registry exists
const registry = (z as any).globalRegistry;
if (registry) {
	registry.add(healthResponseSchema, { id: "HealthResponse" });
	registry.add(extractJobRequestSchema, { id: "ExtractJobRequest" });
	registry.add(jobExtractionResultSchema, { id: "JobExtractionResult" });
	registry.add(companionErrorResponseSchema, {
		id: "CompanionErrorResponse",
	});
	registry.add(crawlStatusSchema, { id: "CrawlStatus" });
	registry.add(createJobRequestSchema, { id: "CreateJobRequest" });
	registry.add(jobIdParamsSchema, { id: "JobIdParams" });
	registry.add(companionJobSchema, { id: "CompanionJob" });
	registry.add(companionJobsResponseSchema, {
		id: "CompanionJobsResponse",
	});
	registry.add(deleteJobResponseSchema, { id: "DeleteJobResponse" });
	registry.add(resumeContentSchema, { id: "ResumeContent" });
	registry.add(resumeSummarySchema, { id: "ResumeSummary" });
	registry.add(resumeDetailsSchema, { id: "ResumeDetails" });
	registry.add(resumesResponseSchema, { id: "ResumesResponse" });
	registry.add(deleteResumeResponseSchema, { id: "DeleteResumeResponse" });
	registry.add(createResumeRequestSchema, { id: "CreateResumeRequest" });
	registry.add(updateResumeRequestSchema, { id: "UpdateResumeRequest" });
	registry.add(candidateProfileSchema, { id: "CandidateProfile" });
	registry.add(resumeSyncRequestSchema, { id: "ResumeSyncRequest" });
	registry.add(okResponseSchema, { id: "OkResponse" });
	registry.add(jobFitBriefSchema, { id: "JobFitBrief" });
}
