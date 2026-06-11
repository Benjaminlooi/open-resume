import { z } from "zod";

const companionBaseUrl = "http://127.0.0.1:47321";

const companionJobSchema = z.object({
	id: z.string(),
	sourceUrl: z.string().url(),
	crawlStatus: z.enum(["pending", "crawling", "analyzing", "ready", "failed"]),
	crawlError: z.string().nullable(),
	cleanedText: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	crawledAt: z.number().nullable(),
	parsedTitle: z.string().nullable().optional(),
	parsedCompany: z.string().nullable().optional(),
	parsedLocation: z.string().nullable().optional(),
	parsedDescription: z.string().nullable().optional(),
	fitScore: z.number().nullable().optional(),
	fitBriefJson: z.string().nullable().optional(),
});

const companionJobsResponseSchema = z.object({
	jobs: z.array(companionJobSchema),
});

const deleteJobResponseSchema = z.object({
	deleted: z.boolean(),
});

export const targetRoleArchetypeSchema = z
	.object({
		name: z.string(),
		level: z.string(),
		fit: z.enum(["primary", "secondary", "adjacent"]),
	})
	.strict();

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

export const resumeSyncRequestSchema = z
	.object({
		resume: z.record(z.string(), z.unknown()),
	})
	.strict();

export const okResponseSchema = z
	.object({
		ok: z.boolean(),
	})
	.strict();

export type LocalCompanionJob = z.infer<typeof companionJobSchema>;
export type TargetRoleArchetype = z.infer<typeof targetRoleArchetypeSchema>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type ResumeSyncRequest = z.infer<typeof resumeSyncRequestSchema>;
export type OkResponse = z.infer<typeof okResponseSchema>;

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

export async function createCompanionJob(
	sourceUrl: string,
): Promise<LocalCompanionJob> {
	const response = await companionFetch("/jobs", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ sourceUrl }),
	});
	return parseCompanionResponse(
		response,
		companionJobSchema,
		"Local companion could not create this job.",
	);
}

export async function listCompanionJobs(): Promise<LocalCompanionJob[]> {
	const response = await companionFetch("/jobs");
	const parsed = await parseCompanionResponse(
		response,
		companionJobsResponseSchema,
		"Local companion could not list jobs.",
	);
	return parsed.jobs;
}

export async function retryCompanionJobCrawl(
	id: string,
): Promise<LocalCompanionJob> {
	const response = await companionFetch(`/jobs/${id}/retry-crawl`, {
		method: "POST",
	});
	return parseCompanionResponse(
		response,
		companionJobSchema,
		"Local companion could not retry this crawl.",
	);
}

export async function deleteCompanionJob(
	id: string,
): Promise<{ deleted: boolean }> {
	const response = await companionFetch(`/jobs/${id}`, {
		method: "DELETE",
	});
	return parseCompanionResponse(
		response,
		deleteJobResponseSchema,
		"Local companion could not delete this job.",
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
