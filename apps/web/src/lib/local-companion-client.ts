import {
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
	updateResumeRequestSchema,
} from "@open-resume/contracts";
import type { z } from "zod";

export {
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
	UpdateResumeRequest,
} from "@open-resume/contracts";

export type {
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
	JobApplication,
	JobApplicationsResponse,
};

export const companionBaseUrl = "http://127.0.0.1:47321";

async function companionFetch(
	path: string,
	init?: RequestInit,
): Promise<Response> {
	try {
		return await fetch(`${companionBaseUrl}${path}`, init);
	} catch {
		throw new Error(
			"Local companion is not reachable. Start it with pnpm companion:dev.",
		);
	}
}

async function parseCompanionResponse<T>(
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
	const response = await companionFetch("/job-postings", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ sourceUrl }),
	});
	return parseCompanionResponse(
		response,
		jobPostingSchema,
		"Local companion could not create this job posting.",
	);
}

export async function listJobPostings(): Promise<LocalJobPosting[]> {
	const response = await companionFetch("/job-postings");
	const parsed = await parseCompanionResponse(
		response,
		jobPostingsResponseSchema,
		"Local companion could not list job postings.",
	);
	return parsed.jobPostings;
}

export async function retryJobPostingCrawl(
	id: string,
): Promise<LocalJobPosting> {
	const response = await companionFetch(`/job-postings/${id}/retry-crawl`, {
		method: "POST",
	});
	return parseCompanionResponse(
		response,
		jobPostingSchema,
		"Local companion could not retry this crawl.",
	);
}

export async function retryJobPostingAnalyze(
	id: string,
): Promise<LocalJobPosting> {
	const response = await companionFetch(`/job-postings/${id}/retry-analyze`, {
		method: "POST",
	});
	return parseCompanionResponse(
		response,
		jobPostingSchema,
		"Local companion could not retry this analysis.",
	);
}

export async function deleteJobPosting(
	id: string,
): Promise<{ deleted: boolean }> {
	const response = await companionFetch(`/job-postings/${id}`, {
		method: "DELETE",
	});
	return parseCompanionResponse(
		response,
		deleteJobPostingResponseSchema,
		"Local companion could not delete this job posting.",
	);
}

export async function getProfile(): Promise<CandidateProfile> {
	const response = await companionFetch("/profile");
	return parseCompanionResponse(
		response,
		candidateProfileSchema,
		"Local companion could not retrieve profile.",
	);
}

export async function updateProfile(
	profile: CandidateProfile,
): Promise<CandidateProfile> {
	const response = await companionFetch("/profile", {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(profile),
	});
	return parseCompanionResponse(
		response,
		candidateProfileSchema,
		"Local companion could not update profile.",
	);
}

export async function syncResume(
	resume: Record<string, unknown>,
): Promise<OkResponse> {
	const response = await companionFetch("/profile/resume", {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ resume }),
	});
	return parseCompanionResponse(
		response,
		okResponseSchema,
		"Local companion could not sync default resume.",
	);
}

export async function listResumes(): Promise<ResumeSummary[]> {
	const response = await companionFetch("/resumes");
	const parsed = await parseCompanionResponse(
		response,
		resumesResponseSchema,
		"Local companion could not list resumes.",
	);
	return parsed.resumes;
}

export async function getResume(id: string): Promise<ResumeDetails> {
	const response = await companionFetch(`/resumes/${id}`);
	return parseCompanionResponse(
		response,
		resumeDetailsSchema,
		"Local companion could not retrieve this resume.",
	);
}

export async function createResume(
	id: string,
	name: string,
	templateId: string,
	content: ResumeContent,
): Promise<ResumeDetails> {
	const response = await companionFetch("/resumes", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ id, name, templateId, content }),
	});
	return parseCompanionResponse(
		response,
		resumeDetailsSchema,
		"Local companion could not create this resume.",
	);
}

export async function updateResume(
	id: string,
	data: UpdateResumeRequest,
): Promise<ResumeDetails> {
	const response = await companionFetch(`/resumes/${id}`, {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(data),
	});
	return parseCompanionResponse(
		response,
		resumeDetailsSchema,
		"Local companion could not update this resume.",
	);
}

export async function deleteResume(id: string): Promise<{ deleted: boolean }> {
	const response = await companionFetch(`/resumes/${id}`, {
		method: "DELETE",
	});
	return parseCompanionResponse(
		response,
		deleteResumeResponseSchema,
		"Local companion could not delete this resume.",
	);
}

export async function setDefaultResume(id: string): Promise<ResumeDetails> {
	const response = await companionFetch(`/resumes/${id}/default`, {
		method: "PUT",
	});
	return parseCompanionResponse(
		response,
		resumeDetailsSchema,
		"Local companion could not set the default resume.",
	);
}

export async function clearDefaultResume(): Promise<OkResponse> {
	const response = await companionFetch("/resumes/default", {
		method: "DELETE",
	});
	return parseCompanionResponse(
		response,
		okResponseSchema,
		"Local companion could not clear the default resume.",
	);
}

export async function listJobApplications(): Promise<JobApplication[]> {
	const response = await companionFetch("/job-applications");
	const parsed = await parseCompanionResponse(
		response,
		jobApplicationsResponseSchema,
		"Local companion could not list job applications.",
	);
	return parsed.jobApplications;
}

export async function getJobApplication(id: string): Promise<JobApplication> {
	const response = await companionFetch(`/job-applications/${id}`);
	return parseCompanionResponse(
		response,
		jobApplicationSchema,
		"Local companion could not retrieve this job application.",
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
	const response = await companionFetch("/job-applications", {
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
	return parseCompanionResponse(
		response,
		jobApplicationSchema,
		"Local companion could not create this job application.",
	);
}

export async function updateJobApplication(
	id: string,
	data: any,
): Promise<JobApplication> {
	const response = await companionFetch(`/job-applications/${id}`, {
		method: "PUT",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(data),
	});
	return parseCompanionResponse(
		response,
		jobApplicationSchema,
		"Local companion could not update this job application.",
	);
}

export async function deleteJobApplication(
	id: string,
): Promise<{ deleted: boolean }> {
	const response = await companionFetch(`/job-applications/${id}`, {
		method: "DELETE",
	});
	return parseCompanionResponse(
		response,
		deleteJobPostingResponseSchema,
		"Local companion could not delete this job application.",
	);
}

export async function convertJobToApplication(
	id: string,
): Promise<JobApplication> {
	const response = await companionFetch(`/job-postings/${id}/convert`, {
		method: "POST",
	});
	return parseCompanionResponse(
		response,
		jobApplicationSchema,
		"Local companion could not convert this job posting.",
	);
}
