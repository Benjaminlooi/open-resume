import { z } from "zod";

const companionBaseUrl = "http://127.0.0.1:47321";

const companionJobSchema = z.object({
	id: z.string(),
	sourceUrl: z.string().url(),
	crawlStatus: z.enum(["pending", "crawling", "ready", "failed"]),
	crawlError: z.string().nullable(),
	cleanedText: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	crawledAt: z.number().nullable(),
});

const companionJobsResponseSchema = z.object({
	jobs: z.array(companionJobSchema),
});

const deleteJobResponseSchema = z.object({
	deleted: z.boolean(),
});

export type LocalCompanionJob = z.infer<typeof companionJobSchema>;

async function companionFetch(path: string, init?: RequestInit): Promise<Response> {
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
