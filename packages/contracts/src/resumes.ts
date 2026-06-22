import { z } from "zod";

export const resumeContentSchema = z.record(z.string(), z.unknown());

export type ResumeContent = z.infer<typeof resumeContentSchema>;

export const resumeSummarySchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		templateId: z.string().min(1),
		lastModified: z.number().describe("Unix timestamp in milliseconds."),
		isDefault: z.boolean(),
	})
	.strict();

export type ResumeSummary = z.infer<typeof resumeSummarySchema>;

export const resumeDetailsSchema = resumeSummarySchema
	.extend({
		content: resumeContentSchema,
	})
	.strict();

export type ResumeDetails = z.infer<typeof resumeDetailsSchema>;

export const resumesResponseSchema = z
	.object({
		resumes: z.array(resumeSummarySchema),
	})
	.strict();

export type ResumesResponse = z.infer<typeof resumesResponseSchema>;

export const deleteResumeResponseSchema = z
	.object({
		deleted: z.boolean(),
	})
	.strict();

export type DeleteResumeResponse = z.infer<typeof deleteResumeResponseSchema>;

export const createResumeRequestSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		templateId: z.string().min(1),
		content: resumeContentSchema,
	})
	.strict();

export type CreateResumeRequest = z.infer<typeof createResumeRequestSchema>;

export const updateResumeRequestSchema = z
	.object({
		name: z.string().min(1).optional(),
		templateId: z.string().min(1).optional(),
		content: resumeContentSchema.optional(),
	})
	.strict();

export type UpdateResumeRequest = z.infer<typeof updateResumeRequestSchema>;

export const resumeSyncRequestSchema = z
	.object({
		resume: z.record(z.string(), z.unknown()),
	})
	.strict();

export type ResumeSyncRequest = z.infer<typeof resumeSyncRequestSchema>;

export const syncedResumeResponseSchema = z.record(z.string(), z.unknown());
