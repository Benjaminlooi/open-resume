import { describe, expect, it, vi } from "vitest";
import type { Resume } from "#/lib/resume-schema";
import {
	generateCoverLetter,
	generateJobFitBrief,
	generateResumeTailoring,
} from "./job-ai";
import type { JobApplication, JobFitBrief } from "./job-application-schema";

const mockResume: Resume = {
	personalInfo: {
		fullName: "Jane Doe",
		email: "jane.doe@example.com",
		phone: "123-456-7890",
		location: "San Francisco, CA",
		contactLinks: [],
	},
	summary: "Experienced software engineer specializing in frontend.",
	sections: [
		{ id: "summary", name: "Summary", visible: true },
		{ id: "experience", name: "Experience", visible: true },
		{ id: "skills", name: "Skills", visible: true },
		{ id: "projects", name: "Projects", visible: true },
	],
	experience: [
		{
			id: "exp-1",
			company: "Tech Corp",
			role: "Software Engineer",
			startDate: "2020",
			endDate: "2023",
			location: "SF",
			bullets: undefined,
			description:
				"Worked on frontend features. <ul><li>Built awesome features</li><li>Improved performance</li></ul>",
		},
	],
	education: [],
	skills: [
		{
			id: "skills-1",
			category: "Languages",
			items: "JavaScript, TypeScript, HTML",
		},
	],
	projects: [
		{
			id: "proj-1",
			name: "Project Alpha",
			url: "https://alpha.example.com",
			date: "2022",
			description: "An open source project",
		},
	],
	certifications: [],
	languages: [],
};

const mockJob: JobApplication = {
	id: "job-1",
	company: "NextGen Inc",
	title: "Senior React Developer",
	location: "Remote",
	sourceUrl: "https://nextgen.example.com/jobs",
	description:
		"We are looking for a Senior React Developer who knows TypeScript and CSS.",
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
	createdAt: Date.now(),
	updatedAt: Date.now(),
};

const mockFitBrief: JobFitBrief = {
	roleSummary: "Senior React role working with TS.",
	requirements: ["React", "TypeScript"],
	keywords: ["React", "CSS"],
	strengths: ["Strong React background"],
	gaps: ["No backend skills listed"],
	risks: ["None"],
	nextActions: ["Prepare for React questions"],
	generatedAt: Date.now(),
};

describe("Frontend job-ai fetch wrappers", () => {
	it("generateJobFitBrief calls /ai/fit-brief and returns fit brief", async () => {
		const globalFetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockFitBrief,
		});
		vi.stubGlobal("fetch", globalFetchMock);

		const result = await generateJobFitBrief({ provider: "backend" }, mockJob, mockResume);
		expect(globalFetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/ai/fit-brief"),
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ job: mockJob, resume: mockResume }),
			})
		);
		expect(result.roleSummary).toBe("Senior React role working with TS.");
		vi.unstubAllGlobals();
	});

	it("generateResumeTailoring calls /ai/tailor and returns proposals", async () => {
		const mockProposals = [
			{
				id: "prop-1",
				target: { section: "summary" },
				currentText: "Old",
				suggestedText: "New",
				rationale: "Better",
				status: "pending",
				createdAt: Date.now(),
			},
		];
		const globalFetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ proposals: mockProposals }),
		});
		vi.stubGlobal("fetch", globalFetchMock);

		const result = await generateResumeTailoring({ provider: "backend" }, mockJob, mockFitBrief, mockResume);
		expect(globalFetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/ai/tailor"),
			expect.objectContaining({
				method: "POST",
			})
		);
		expect(result).toHaveLength(1);
		expect(result[0].suggestedText).toBe("New");
		vi.unstubAllGlobals();
	});

	it("generateCoverLetter calls /ai/cover-letter and returns draft", async () => {
		const mockDraft = {
			content: "Letter body",
			generatedAt: Date.now(),
			updatedAt: Date.now(),
		};
		const globalFetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockDraft,
		});
		vi.stubGlobal("fetch", globalFetchMock);

		const result = await generateCoverLetter({ provider: "backend" }, mockJob, mockFitBrief, mockResume);
		expect(globalFetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/ai/cover-letter"),
			expect.objectContaining({
				method: "POST",
			})
		);
		expect(result.content).toBe("Letter body");
		vi.unstubAllGlobals();
	});
});
