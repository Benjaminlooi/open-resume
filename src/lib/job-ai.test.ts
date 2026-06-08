import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildJobAnalysisPrompt,
	buildResumeTailoringPrompt,
	parseCoverLetterDraft,
	parseJobFitBrief,
	parseResumeEditProposals,
} from "./job-ai";
import type { JobApplication, JobFitBrief } from "./job-application-schema";
import type { Resume } from "./resume-schema";

const resume: Resume = {
	personalInfo: {
		fullName: "Alex Morgan",
		email: "alex@example.com",
		phone: "",
		location: "Remote",
		contactLinks: [],
	},
	summary: "Product leader",
	sections: [],
	experience: [
		{
			id: "exp-1",
			company: "Acme",
			role: "Product Manager",
			startDate: "2024",
			endDate: "Present",
			location: "Remote",
			description: "Owned roadmap",
		},
	],
	education: [],
	skills: [{ id: "skills-1", category: "Tools", items: "SQL, Figma" }],
	projects: [],
	certifications: [],
	languages: [],
};

const job: JobApplication = {
	id: "job-1",
	company: "Northstar",
	title: "Senior Product Manager",
	location: "Remote",
	sourceUrl: "",
	description: "Lead B2B SaaS growth experiments and roadmap planning.",
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
	createdAt: 1,
	updatedAt: 1,
};

const fitBrief: JobFitBrief = {
	roleSummary: "Lead SaaS product growth.",
	requirements: ["Roadmap planning"],
	keywords: ["B2B SaaS"],
	strengths: ["Product leadership"],
	gaps: [],
	risks: [],
	nextActions: ["Tailor summary"],
	generatedAt: 1,
};

describe("job AI helpers", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-08T11:00:00Z"));
	});

	it("builds grounded prompts that forbid invented experience", () => {
		const analysisPrompt = buildJobAnalysisPrompt(job, resume);
		const tailoringPrompt = buildResumeTailoringPrompt(job, fitBrief, resume);

		expect(analysisPrompt).toContain("Do not invent employers");
		expect(analysisPrompt).toContain("Ground every recommendation");
		expect(analysisPrompt).toContain("Northstar");
		expect(tailoringPrompt).toContain("Allowed targets");
		expect(tailoringPrompt).toContain('"section": "summary"');
	});

	it("parses job fit brief JSON into a generated artifact", () => {
		const result = parseJobFitBrief(`{
			"roleSummary": "Good fit for SaaS product work.",
			"requirements": ["Roadmap"],
			"keywords": ["SaaS"],
			"strengths": ["Product leadership"],
			"gaps": ["No explicit growth metrics"],
			"risks": [],
			"nextActions": ["Add metrics if true"]
		}`);

		expect(result.ok).toBe(true);
		expect(result.value?.generatedAt).toBe(Date.now());
		expect(result.value?.keywords).toEqual(["SaaS"]);
	});

	it("returns a user-facing error for invalid JSON", () => {
		const result = parseJobFitBrief("not-json");

		expect(result.ok).toBe(false);
		expect(result.error).toContain("invalid job analysis JSON");
	});

	it("parses supported resume edit proposals", () => {
		const result = parseResumeEditProposals(`{
			"proposals": [
				{
					"target": { "section": "summary" },
					"currentText": "Product leader",
					"suggestedText": "B2B SaaS product leader",
					"rationale": "Matches the role."
				}
			]
		}`);

		expect(result.ok).toBe(true);
		expect(result.value?.[0]).toMatchObject({
			target: { section: "summary" },
			status: "pending",
			suggestedText: "B2B SaaS product leader",
		});
	});

	it("rejects unsupported proposal targets", () => {
		const result = parseResumeEditProposals(`{
			"proposals": [
				{
					"target": { "section": "education", "itemId": "edu-1" },
					"currentText": "BS",
					"suggestedText": "MBA",
					"rationale": "Unsupported"
				}
			]
		}`);

		expect(result.ok).toBe(false);
		expect(result.error).toContain("unsupported resume edit targets");
	});

	it("parses cover letter drafts", () => {
		const result = parseCoverLetterDraft(
			JSON.stringify({ content: "Dear Northstar,\n\nI am interested." }),
		);

		expect(result.ok).toBe(true);
		expect(result.value?.content).toContain("Dear Northstar");
		expect(result.value?.updatedAt).toBe(Date.now());
	});
});
