import { z } from "zod";
import { resumeSchema } from "#/lib/resume-schema";
import {
	jobApplicationSchema as baseJobApplicationSchema,
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
} from "@open-resume/contracts";

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
