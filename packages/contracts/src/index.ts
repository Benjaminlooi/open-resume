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

// Register schemas globally for fastify-type-provider-zod swagger generators
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
z.globalRegistry.add(resumeContentSchema, { id: "ResumeContent" });
z.globalRegistry.add(resumeSummarySchema, { id: "ResumeSummary" });
z.globalRegistry.add(resumeDetailsSchema, { id: "ResumeDetails" });
z.globalRegistry.add(resumesResponseSchema, { id: "ResumesResponse" });
z.globalRegistry.add(createResumeRequestSchema, { id: "CreateResumeRequest" });
z.globalRegistry.add(updateResumeRequestSchema, { id: "UpdateResumeRequest" });
z.globalRegistry.add(candidateProfileSchema, { id: "CandidateProfile" });
z.globalRegistry.add(resumeSyncRequestSchema, { id: "ResumeSyncRequest" });
z.globalRegistry.add(okResponseSchema, { id: "OkResponse" });
z.globalRegistry.add(jobFitBriefSchema, { id: "JobFitBrief" });
