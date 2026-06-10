import { z } from "zod";

const companionBaseUrl = "http://127.0.0.1:47321";

const jobExtractionResultSchema = z.object({
	sourceUrl: z.string().url(),
	title: z.string(),
	company: z.string(),
	location: z.string(),
	description: z.string(),
	rawText: z.string(),
	extractionMethod: z.enum(["json-ld", "readability", "playwright"]),
	extractedAt: z.number(),
});

export type LocalCompanionJobExtraction = z.infer<
	typeof jobExtractionResultSchema
>;

export async function extractJobWithLocalCompanion(
	url: string,
): Promise<LocalCompanionJobExtraction> {
	let response: Response;

	try {
		response = await fetch(`${companionBaseUrl}/extract-job`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ url }),
		});
	} catch {
		throw new Error(
			"Local companion is not reachable. Start it with pnpm companion:dev.",
		);
	}

	if (!response.ok) {
		throw new Error("Local companion could not extract this job URL.");
	}

	return jobExtractionResultSchema.parse(await response.json());
}
