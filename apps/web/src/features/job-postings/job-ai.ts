import { backendBaseUrl } from "#/lib/local-backend-client";
import type { Resume } from "#/lib/resume-schema";
import {
	type CoverLetterDraft,
	coverLetterDraftSchema,
	type JobApplication,
	type JobFitBrief,
	jobFitBriefSchema,
	type ResumeEditProposal,
	resumeEditProposalSchema,
} from "./job-application-schema";

export interface ProviderConfig {
	provider: string;
}

export function getProviderConfig(): ProviderConfig {
	return { provider: "backend" };
}

async function callBackendAi(endpoint: string, body: unknown): Promise<unknown> {
	const response = await fetch(`${backendBaseUrl}${endpoint}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(errText || `Backend AI generation failed on ${endpoint}`);
	}

	return response.json();
}

export async function generateJobFitBrief(
	_config: ProviderConfig,
	job: JobApplication,
	resume: Resume
): Promise<JobFitBrief> {
	const data = await callBackendAi("/ai/fit-brief", { job, resume });
	return jobFitBriefSchema.parse(data);
}

export async function generateResumeTailoring(
	_config: ProviderConfig,
	job: JobApplication,
	fitBrief: JobFitBrief,
	resume: Resume
): Promise<ResumeEditProposal[]> {
	const data = await callBackendAi("/ai/tailor", { job, fitBrief, resume });
	if (!data || typeof data !== "object" || !("proposals" in data) || !Array.isArray(data.proposals)) {
		throw new Error("Invalid tailoring proposals response structure");
	}
	return data.proposals.map((p) => resumeEditProposalSchema.parse(p));
}

export async function generateCoverLetter(
	_config: ProviderConfig,
	job: JobApplication,
	fitBrief: JobFitBrief,
	resume: Resume
): Promise<CoverLetterDraft> {
	const data = await callBackendAi("/ai/cover-letter", { job, fitBrief, resume });
	return coverLetterDraftSchema.parse(data);
}
