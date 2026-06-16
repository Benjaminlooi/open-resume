import { z } from "zod";
import { httpUrlSchema } from "./common.js";
import { jobFitBriefSchema } from "./jobs.js";
import { resumeContentSchema } from "./resumes.js";

export const jobApplicationStatusSchema = z.enum([
	"saved",
	"analyzing",
	"tailoring",
	"applied",
	"interviewing",
	"offer",
	"rejected",
	"archived",
]);

export type JobApplicationStatus = z.infer<typeof jobApplicationStatusSchema>;

export const resumeEditProposalStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"applied",
]);

export type ResumeEditProposalStatus = z.infer<
	typeof resumeEditProposalStatusSchema
>;

export const resumeEditTargetSchema = z.union([
	z.object({ section: z.literal("summary") }),
	z.object({
		section: z.literal("experience"),
		itemId: z.string(),
		field: z.enum(["role", "description"]),
	}),
	z.object({
		section: z.literal("experience"),
		itemId: z.string(),
		field: z.literal("bullet"),
		bulletIndex: z.number(),
	}),
	z.object({
		section: z.literal("skills"),
		itemId: z.string(),
		field: z.literal("items"),
	}),
	z.object({
		section: z.literal("projects"),
		itemId: z.string(),
		field: z.literal("description"),
	}),
]);

export type ResumeEditTarget = z.infer<typeof resumeEditTargetSchema>;

export const resumeEditProposalSchema = z
	.object({
		id: z.string(),
		target: resumeEditTargetSchema,
		currentText: z.string(),
		suggestedText: z.string(),
		rationale: z.string(),
		status: resumeEditProposalStatusSchema,
		createdAt: z.number(),
		appliedAt: z.number().optional(),
	})
	.strict();

export type ResumeEditProposal = z.infer<typeof resumeEditProposalSchema>;

export const coverLetterDraftSchema = z
	.object({
		content: z.string(),
		generatedAt: z.number(),
		updatedAt: z.number(),
	})
	.strict();

export type CoverLetterDraft = z.infer<typeof coverLetterDraftSchema>;

export const jobApplicationSchema = z
	.object({
		id: z.string().min(1),
		company: z.string(),
		title: z.string(),
		location: z.string(),
		sourceUrl: httpUrlSchema,
		description: z.string(),
		status: jobApplicationStatusSchema,
		sourceResumeId: z.string().nullable(),
		sourceResumeName: z.string().nullable(),
		sourceResumeSnapshot: resumeContentSchema.nullable(),
		tailoredResume: resumeContentSchema.nullable(),
		fitBrief: jobFitBriefSchema.nullable(),
		resumeEditProposals: z.array(resumeEditProposalSchema),
		coverLetterDraft: coverLetterDraftSchema.nullable(),
		notes: z.string(),
		followUpAt: z.number().nullable(),
		createdAt: z.number(),
		updatedAt: z.number(),
	})
	.strict();

export type JobApplication = z.infer<typeof jobApplicationSchema>;

export const jobApplicationsResponseSchema = z
	.object({
		jobApplications: z.array(jobApplicationSchema),
	})
	.strict();

export type JobApplicationsResponse = z.infer<
	typeof jobApplicationsResponseSchema
>;
