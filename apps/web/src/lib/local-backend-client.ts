import {
	aiConfigResponseSchema,
	candidateProfileSchema,
	createResumeRequestSchema,
	deleteJobPostingResponseSchema,
	deleteResumeResponseSchema,
	jobApplicationSchema,
	jobApplicationsResponseSchema,
	jobPostingSchema,
	jobPostingsResponseSchema,
	okResponseSchema,
	resumeContentSchema,
	resumeDetailsSchema,
	resumeSummarySchema,
	resumeSyncRequestSchema,
	resumesResponseSchema,
	targetRoleArchetypeSchema,
	updateAiConfigRequestSchema,
	updateAiConfigResponseSchema,
	updateResumeRequestSchema,
} from "@open-resume/contracts";
import type { z } from "zod";

export {
	aiConfigResponseSchema,
	updateAiConfigRequestSchema,
	updateAiConfigResponseSchema,
	resumeContentSchema,
	resumeSummarySchema,
	resumeDetailsSchema,
	createResumeRequestSchema,
	updateResumeRequestSchema,
	targetRoleArchetypeSchema,
	candidateProfileSchema,
	resumeSyncRequestSchema,
	okResponseSchema,
	jobApplicationSchema,
	jobApplicationsResponseSchema,
};

import type {
	AIConfigResponse,
	CandidateProfile,
	CreateResumeRequest,
	JobApplication,
	JobApplicationsResponse,
	JobPosting as LocalJobPosting,
	OkResponse,
	ResumeContent,
	ResumeDetails,
	ResumeSummary,
	ResumeSyncRequest,
	TargetRoleArchetype,
	UpdateAiConfigRequest,
	UpdateAiConfigResponse,
	UpdateResumeRequest,
} from "@open-resume/contracts";

export type {
	AIConfigResponse,
	LocalJobPosting,
	TargetRoleArchetype,
	CandidateProfile,
	ResumeSyncRequest,
	OkResponse,
	ResumeContent,
	ResumeSummary,
	ResumeDetails,
	CreateResumeRequest,
	UpdateResumeRequest,
	UpdateAiConfigRequest,
	UpdateAiConfigResponse,
	JobApplication,
	JobApplicationsResponse,
};

export const backendBaseUrl = "http://127.0.0.1:47321";

async function backendFetch(
	path: string,
	init?: RequestInit,
): Promise<Response> {
	try {
		return await fetch(`${backendBaseUrl}${path}`, init);
	} catch {
		throw new Error(
			"Local backend is not reachable. Start it with pnpm backend:dev.",
		);
	}
}

async function parseBackendResponse<T>(
	response: Response,
	schema: z.ZodType<T>,
	fallbackMessage: string,
): Promise<T> {
	if (!response.ok) {
		throw new Error(fallbackMessage);
	}
	return schema.parse(await response.json());
}

export async function createJobPosting(
	sourceUrl: string,
): Promise<LocalJobPosting> {
	const response = await backendFetch("/job-postings", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ sourceUrl }),
	});
	return parseBackendResponse(
		response,
		jobPostingSchema,
		"Local backend could not create this job posting.",
	);
}

export async function listJobPostings(): Promise<LocalJobPosting[]> {
	const response = await backendFetch("/job-postings");
	const parsed = await parseBackendResponse(
		response,
		jobPostingsResponseSchema,
		"Local backend could not list job postings.",
	);
	return parsed.jobPostings;
}

export async function retryJobPostingCrawl(
	id: string,
): Promise<LocalJobPosting> {
	const response = await backendFetch(`/job-postings/${id}/retry-crawl`, {
		method: "POST",
	});
	return parseBackendResponse(
		response,
		jobPostingSchema,
		"Local backend could not retry this crawl.",
	);
}

export async function retryJobPostingAnalyze(
	id: string,
): Promise<LocalJobPosting> {
	const response = await backendFetch(`/job-postings/${id}/retry-analyze`, {
		method: "POST",
	});
	return parseBackendResponse(
		response,
		jobPostingSchema,
		"Local backend could not retry this analysis.",
	);
}

export async function deleteJobPosting(
	id: string,
): Promise<{ deleted: boolean }> {
	const response = await backendFetch(`/job-postings/${id}`, {
		method: "DELETE",
	});
	return parseBackendResponse(
		response,
		deleteJobPostingResponseSchema,
		"Local backend could not delete this job posting.",
	);
}

export async function getProfile(): Promise<CandidateProfile> {
	const response = await backendFetch("/profile");
	return parseBackendResponse(
		response,
		candidateProfileSchema,
		"Local backend could not retrieve profile.",
	);
}

export async function updateProfile(
	profile: CandidateProfile,
): Promise<CandidateProfile> {
	const response = await backendFetch("/profile", {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(profile),
	});
	return parseBackendResponse(
		response,
		candidateProfileSchema,
		"Local backend could not update profile.",
	);
}

export async function syncResume(
	resume: Record<string, unknown>,
): Promise<OkResponse> {
	const response = await backendFetch("/profile/resume", {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ resume }),
	});
	return parseBackendResponse(
		response,
		okResponseSchema,
		"Local backend could not sync default resume.",
	);
}

export async function listResumes(): Promise<ResumeSummary[]> {
	const response = await backendFetch("/resumes");
	const parsed = await parseBackendResponse(
		response,
		resumesResponseSchema,
		"Local backend could not list resumes.",
	);
	return parsed.resumes;
}

export async function getResume(id: string): Promise<ResumeDetails> {
	const response = await backendFetch(`/resumes/${id}`);
	return parseBackendResponse(
		response,
		resumeDetailsSchema,
		"Local backend could not retrieve this resume.",
	);
}

export async function createResume(
	id: string,
	name: string,
	templateId: string,
	content: ResumeContent,
): Promise<ResumeDetails> {
	const response = await backendFetch("/resumes", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ id, name, templateId, content }),
	});
	return parseBackendResponse(
		response,
		resumeDetailsSchema,
		"Local backend could not create this resume.",
	);
}

export async function updateResume(
	id: string,
	data: UpdateResumeRequest,
): Promise<ResumeDetails> {
	const response = await backendFetch(`/resumes/${id}`, {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(data),
	});
	return parseBackendResponse(
		response,
		resumeDetailsSchema,
		"Local backend could not update this resume.",
	);
}

export async function deleteResume(id: string): Promise<{ deleted: boolean }> {
	const response = await backendFetch(`/resumes/${id}`, {
		method: "DELETE",
	});
	return parseBackendResponse(
		response,
		deleteResumeResponseSchema,
		"Local backend could not delete this resume.",
	);
}

export async function setDefaultResume(id: string): Promise<ResumeDetails> {
	const response = await backendFetch(`/resumes/${id}/default`, {
		method: "PUT",
	});
	return parseBackendResponse(
		response,
		resumeDetailsSchema,
		"Local backend could not set the default resume.",
	);
}

export async function clearDefaultResume(): Promise<OkResponse> {
	const response = await backendFetch("/resumes/default", {
		method: "DELETE",
	});
	return parseBackendResponse(
		response,
		okResponseSchema,
		"Local backend could not clear the default resume.",
	);
}

export async function listJobApplications(): Promise<JobApplication[]> {
	const response = await backendFetch("/job-applications");
	const parsed = await parseBackendResponse(
		response,
		jobApplicationsResponseSchema,
		"Local backend could not list job applications.",
	);
	return parsed.jobApplications;
}

export async function getJobApplication(id: string): Promise<JobApplication> {
	const response = await backendFetch(`/job-applications/${id}`);
	return parseBackendResponse(
		response,
		jobApplicationSchema,
		"Local backend could not retrieve this job application.",
	);
}

export async function createJobApplication(
	id: string,
	company: string,
	title: string,
	location: string,
	sourceUrl: string,
	description: string,
): Promise<JobApplication> {
	const response = await backendFetch("/job-applications", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({
			id,
			company,
			title,
			location,
			sourceUrl,
			description,
		}),
	});
	return parseBackendResponse(
		response,
		jobApplicationSchema,
		"Local backend could not create this job application.",
	);
}

export async function updateJobApplication(
	id: string,
	data: any,
): Promise<JobApplication> {
	const response = await backendFetch(`/job-applications/${id}`, {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(data),
	});
	return parseBackendResponse(
		response,
		jobApplicationSchema,
		"Local backend could not update this job application.",
	);
}

export async function deleteJobApplication(
	id: string,
): Promise<{ deleted: boolean }> {
	const response = await backendFetch(`/job-applications/${id}`, {
		method: "DELETE",
	});
	return parseBackendResponse(
		response,
		deleteJobPostingResponseSchema,
		"Local backend could not delete this job application.",
	);
}

export async function convertJobToApplication(
	id: string,
): Promise<JobApplication> {
	const response = await backendFetch(`/job-postings/${id}/convert`, {
		method: "POST",
	});
	return parseBackendResponse(
		response,
		jobApplicationSchema,
		"Local backend could not convert this job posting.",
	);
}

export async function getAIConfig(): Promise<AIConfigResponse> {
	const response = await backendFetch("/ai/config");
	return parseBackendResponse(
		response,
		aiConfigResponseSchema,
		"Local backend could not retrieve AI configuration.",
	);
}

export async function updateAIConfig(
	update: UpdateAiConfigRequest,
): Promise<UpdateAiConfigResponse> {
	const response = await backendFetch("/ai/config", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(update),
	});
	return parseBackendResponse(
		response,
		updateAiConfigResponseSchema,
		"Local backend could not update AI configuration.",
	);
}
