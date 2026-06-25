import { describe, expect, it } from "vitest";
import type { JobApplication } from "./job-application-schema";
import { computePipelineProgress } from "./pipeline-progress";

/**
 * Minimal valid JobApplication fixture, matching the canonical shape used in
 * Steps.test.tsx. Tests spread/override fields to reach specific states.
 */
const baseApp: JobApplication = {
	id: "job-1",
	company: "Acme",
	title: "Engineer",
	location: "Remote",
	sourceUrl: "https://example.com/job",
	description: "A job description.",
	status: "saved",
	sourceResumeId: null,
	sourceResumeName: null,
	sourceResumeSnapshot: null,
	tailoredResume: null,
	fitBrief: null,
	resumeEditProposals: [],
	coverLetterDraft: null,
	notes: "",
	followUpAt: null,
	createdAt: 1000,
	updatedAt: 2000,
};

const aFitBrief = {
	roleSummary: "s",
	requirements: [],
	keywords: [],
	strengths: [],
	gaps: [],
	risks: [],
	nextActions: [],
	generatedAt: 1,
};

const aTailoredResume = {
	personalInfo: {
		fullName: "Test Person",
		email: "",
		phone: "",
		location: "",
		contactLinks: [],
	},
	summary: "",
	sections: [],
	experience: [],
	education: [],
	skills: [],
	projects: [],
	certifications: [],
	languages: [],
};

const pendingProposal = (id: string) => ({
	id,
	target: { section: "summary" as const },
	currentText: "old",
	suggestedText: "new",
	rationale: "why",
	status: "pending" as const,
	createdAt: 1,
});

const appliedProposal = (id: string) => ({
	id,
	target: { section: "summary" as const },
	currentText: "old",
	suggestedText: "new",
	rationale: "why",
	status: "applied" as const,
	createdAt: 1,
	appliedAt: 2,
});

describe("computePipelineProgress — fresh application", () => {
	it("marks details in-progress when description is missing", () => {
		const progress = computePipelineProgress(
			{ ...baseApp, description: "  " },
			true,
		);
		expect(progress.steps.details.status).toBe("in-progress");
	});

	it("marks details complete when title/company/description all present", () => {
		const progress = computePipelineProgress(baseApp, true);
		expect(progress.steps.details.status).toBe("complete");
	});

	it("marks fit as pending (ready) after details are complete", () => {
		const progress = computePipelineProgress(baseApp, true);
		expect(progress.steps.fit.status).toBe("pending");
	});

	it("reports the fit-brief as the overall next action", () => {
		const progress = computePipelineProgress(baseApp, true);
		expect(progress.nextAction).toContain("Fit Analysis");
	});
});

describe("computePipelineProgress — fit brief generated", () => {
	it("marks fit complete and tailoring pending when a default resume exists", () => {
		const progress = computePipelineProgress(
			{ ...baseApp, fitBrief: aFitBrief },
			true,
		);
		expect(progress.steps.fit.status).toBe("complete");
		expect(progress.steps.tailoring.status).toBe("pending");
	});

	it("blocks tailoring when there is no default resume", () => {
		const progress = computePipelineProgress(
			{ ...baseApp, fitBrief: aFitBrief },
			false,
		);
		expect(progress.steps.tailoring.status).toBe("blocked");
		expect(progress.steps.tailoring.nextAction).toContain("default resume");
	});

	it("leaves cover-letter pending once a fit brief exists", () => {
		const progress = computePipelineProgress(
			{ ...baseApp, fitBrief: aFitBrief },
			true,
		);
		expect(progress.steps["cover-letter"].status).toBe("pending");
	});
});

describe("computePipelineProgress — tailoring", () => {
	it("blocks tailoring when no fit brief exists yet", () => {
		const progress = computePipelineProgress(baseApp, true);
		expect(progress.steps.tailoring.status).toBe("blocked");
	});

	it("is in-progress while pending proposals remain", () => {
		const progress = computePipelineProgress(
			{
				...baseApp,
				fitBrief: aFitBrief,
				tailoredResume: aTailoredResume,
				resumeEditProposals: [pendingProposal("p1")],
			},
			true,
		);
		expect(progress.steps.tailoring.status).toBe("in-progress");
		expect(progress.steps.tailoring.nextAction).toContain("Review");
	});

	it("is complete once all proposals are disposed of", () => {
		const progress = computePipelineProgress(
			{
				...baseApp,
				fitBrief: aFitBrief,
				tailoredResume: aTailoredResume,
				resumeEditProposals: [appliedProposal("p1")],
			},
			true,
		);
		expect(progress.steps.tailoring.status).toBe("complete");
	});

	it("is complete when a tailored resume exists with no proposals", () => {
		const progress = computePipelineProgress(
			{
				...baseApp,
				fitBrief: aFitBrief,
				tailoredResume: aTailoredResume,
			},
			true,
		);
		expect(progress.steps.tailoring.status).toBe("complete");
	});
});

describe("computePipelineProgress — cover letter", () => {
	it("blocks the cover letter when there is no fit brief", () => {
		const progress = computePipelineProgress(baseApp, true);
		expect(progress.steps["cover-letter"].status).toBe("blocked");
	});

	it("marks the cover letter complete once a draft exists", () => {
		const progress = computePipelineProgress(
			{
				...baseApp,
				fitBrief: aFitBrief,
				coverLetterDraft: { content: "hi", generatedAt: 1, updatedAt: 1 },
			},
			true,
		);
		expect(progress.steps["cover-letter"].status).toBe("complete");
	});
});

describe("computePipelineProgress — overall next action", () => {
	it("walks forward as each step completes", () => {
		// After fit + tailoring done, the next action is the cover letter.
		const progress = computePipelineProgress(
			{
				...baseApp,
				fitBrief: aFitBrief,
				tailoredResume: aTailoredResume,
				resumeEditProposals: [],
			},
			true,
		);
		expect(progress.nextAction).toContain("Cover Letter");
	});

	it("falls back to the tracker message when everything upstream is complete", () => {
		const progress = computePipelineProgress(
			{
				...baseApp,
				fitBrief: aFitBrief,
				tailoredResume: aTailoredResume,
				resumeEditProposals: [],
				coverLetterDraft: { content: "hi", generatedAt: 1, updatedAt: 1 },
			},
			true,
		);
		expect(progress.nextAction).toContain("Step 5");
	});
});
