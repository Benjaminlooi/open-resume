import {
	jobApplicationSchema as baseJobApplicationSchema,
	type CoverLetterDraft,
	coverLetterDraftSchema,
	type JobApplicationStatus,
	type JobFitBrief,
	jobApplicationStatusSchema,
	jobFitBriefSchema,
	type ResumeEditProposal,
	type ResumeEditProposalStatus,
	type ResumeEditTarget,
	resumeEditProposalSchema,
	resumeEditProposalStatusSchema,
	resumeEditTargetSchema,
} from "@open-resume/contracts";
import type { z } from "zod";
import { resumeSchema } from "#/lib/resume-schema";

export {
	jobApplicationStatusSchema,
	resumeEditProposalStatusSchema,
	resumeEditTargetSchema,
	resumeEditProposalSchema,
	jobFitBriefSchema,
	coverLetterDraftSchema,
	type JobApplicationStatus,
	type ResumeEditProposalStatus,
	type ResumeEditTarget,
	type ResumeEditProposal,
	type JobFitBrief,
	type CoverLetterDraft,
};

export const jobApplicationSchema = baseJobApplicationSchema.extend({
	sourceResumeSnapshot: resumeSchema.nullable(),
	tailoredResume: resumeSchema.nullable(),
});

export type JobApplication = z.infer<typeof jobApplicationSchema>;
