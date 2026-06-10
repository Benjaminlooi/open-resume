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

export const extractJobRequestSchema = z.object({
	url: httpUrlSchema,
});

export type ExtractJobRequest = z.infer<typeof extractJobRequestSchema>;

export const extractionMethodSchema = z.enum([
	"json-ld",
	"readability",
	"playwright",
]);

export const jobExtractionResultSchema = z.object({
	sourceUrl: httpUrlSchema,
	title: z.string(),
	company: z.string(),
	location: z.string(),
	description: z.string(),
	rawText: z.string(),
	extractionMethod: extractionMethodSchema,
	extractedAt: z.number(),
});

export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

export const companionErrorResponseSchema = z.object({
	error: z.string(),
	details: z.string().optional(),
});

export type CompanionErrorResponse = z.infer<
	typeof companionErrorResponseSchema
>;
