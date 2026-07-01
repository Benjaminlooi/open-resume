import { z } from "zod";
import {
	aiConfigResponseSchema,
	updateAiConfigRequestSchema,
	updateAiConfigResponseSchema,
} from "./ai-config.js";
import { backendErrorResponseSchema, okResponseSchema } from "./common.js";
import {
	jobApplicationSchema,
	jobApplicationsResponseSchema,
} from "./job-applications.js";
import {
	jobPostingSchema,
	jobPostingsResponseSchema,
	crawlStatusSchema,
	createJobPostingRequestSchema,
	deleteJobPostingResponseSchema,
	extractJobRequestSchema,
	healthResponseSchema,
	jobExtractionResultSchema,
	jobFitBriefSchema,
	jobIdParamsSchema,
} from "./job-postings.js";
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
export * from "./ai-config.js";
export * from "./common.js";
export * from "./job-applications.js";
export * from "./job-postings.js";
export * from "./profiles.js";
export * from "./resumes.js";

// Register schemas globally for fastify-type-provider-zod swagger generators if registry exists
const registry = (z as any).globalRegistry;
if (registry) {
	registry.add(healthResponseSchema, { id: "HealthResponse" });
	registry.add(extractJobRequestSchema, { id: "ExtractJobRequest" });
	registry.add(jobExtractionResultSchema, { id: "JobExtractionResult" });
	registry.add(backendErrorResponseSchema, {
		id: "BackendErrorResponse",
	});
	registry.add(crawlStatusSchema, { id: "CrawlStatus" });
	registry.add(createJobPostingRequestSchema, { id: "CreateJobPostingRequest" });
	registry.add(jobIdParamsSchema, { id: "JobIdParams" });
	registry.add(jobPostingSchema, { id: "JobPosting" });
	registry.add(jobPostingsResponseSchema, {
		id: "JobPostingsResponse",
	});
	registry.add(deleteJobPostingResponseSchema, { id: "DeleteJobPostingResponse" });
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
	registry.add(jobApplicationSchema, { id: "JobApplication" });
	registry.add(jobApplicationsResponseSchema, {
		id: "JobApplicationsResponse",
	});
	registry.add(aiConfigResponseSchema, { id: "AIConfigResponse" });
	registry.add(updateAiConfigRequestSchema, {
		id: "UpdateAiConfigRequest",
	});
	registry.add(updateAiConfigResponseSchema, {
		id: "UpdateAiConfigResponse",
	});
}
