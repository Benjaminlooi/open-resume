import { z } from "zod";

export const httpUrlSchema = z
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

export const companionErrorResponseSchema = z
	.object({
		error: z.string(),
		details: z.string().optional(),
	})
	.strict();

export type CompanionErrorResponse = z.infer<
	typeof companionErrorResponseSchema
>;

export const okResponseSchema = z
	.object({
		ok: z.boolean(),
	})
	.strict();

export type OkResponse = z.infer<typeof okResponseSchema>;
