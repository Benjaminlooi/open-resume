import { describe, expect, it } from "vitest";
import type {
	CoverLetterDraft,
	JobApplication,
} from "#/lib/job-application-schema";
import type { Resume } from "#/lib/resume-schema";
import {
	exportApplicationPacketToJson,
	exportCoverLetterToMarkdown,
	exportTailoredResumeToMarkdown,
} from "./job-application-export";

const mockResume: Resume = {
	personalInfo: {
		fullName: "Jane Doe",
		email: "jane.doe@example.com",
		phone: "123-456-7890",
		location: "San Francisco, CA",
		contactLinks: [{ id: "1", label: "GitHub", url: "github.com/janedoe" }],
	},
	summary:
		"<p>Experienced software engineer specializing in frontend applications.</p>",
	sections: [
		{ id: "summary", name: "Summary", visible: true },
		{ id: "experience", name: "Experience", visible: true },
	],
	experience: [
		{
			id: "exp-1",
			company: "Tech Corp",
			role: "Senior Engineer",
			startDate: "2020",
			endDate: "Present",
			location: "San Francisco, CA",
			description: "<ul><li>Built user interfaces</li></ul>",
		},
	],
	education: [],
	skills: [],
	projects: [],
	certifications: [],
	languages: [],
};

const mockCoverLetter: CoverLetterDraft = {
	content:
		"Dear Hiring Team,\n\nI am writing to express my interest in the position...",
	generatedAt: 1717945200000, // June 9, 2024
	updatedAt: 1717948800000, // June 9, 2024 (slightly later)
};

const mockJobApplication: JobApplication = {
	id: "job-123",
	company: "Acme Inc",
	title: "Staff Engineer",
	location: "Remote",
	sourceUrl: "https://example.com/jobs/123",
	description: "Looking for an expert to lead frontend team...",
	status: "tailoring",
	sourceResumeId: "default",
	sourceResumeName: "My Resume",
	sourceResumeSnapshot: mockResume,
	tailoredResume: mockResume,
	fitBrief: {
		roleSummary: "Leading frontend teams and architecting applications",
		requirements: ["React experience", "Leadership experience"],
		keywords: ["React", "CSS"],
		strengths: ["Strong CSS", "Leadership experience"],
		gaps: ["No backend experience"],
		risks: [],
		nextActions: [],
		generatedAt: 1717945200000,
	},
	resumeEditProposals: [
		{
			id: "prop-1",
			target: { section: "summary" },
			currentText: "",
			suggestedText: "Experienced React leader...",
			rationale: "Aligns with description",
			status: "pending",
			createdAt: 1717945200000,
		},
	],
	coverLetterDraft: mockCoverLetter,
	notes: "First choice application.",
	followUpAt: null,
	createdAt: 1717945200000,
	updatedAt: 1717948800000,
};

describe("job-application-export", () => {
	describe("exportTailoredResumeToMarkdown", () => {
		it("should correctly serialize the resume to markdown", () => {
			const md = exportTailoredResumeToMarkdown(mockResume);
			expect(md).toContain("# Jane Doe");
			expect(md).toContain("Email: jane.doe@example.com");
			expect(md).toContain("GitHub: github.com/janedoe");
			expect(md).toContain("## Summary");
			expect(md).toContain(
				"Experienced software engineer specializing in frontend applications.",
			);
			expect(md).toContain("## Experience");
			expect(md).toContain("### Senior Engineer, Tech Corp");
			expect(md).toContain("- Built user interfaces");
		});
	});

	describe("exportCoverLetterToMarkdown", () => {
		it("should format the cover letter with title, date and body", () => {
			const md = exportCoverLetterToMarkdown(
				mockCoverLetter,
				"Staff Engineer",
				"Acme Inc",
			);
			expect(md).toContain("# Cover Letter: Staff Engineer at Acme Inc");
			expect(md).toContain("**Date:** June 9, 2024");
			expect(md).toContain(
				"Dear Hiring Team,\n\nI am writing to express my interest in the position...",
			);
		});
	});

	describe("exportApplicationPacketToJson", () => {
		it("should serialize the entire application packet to formatted JSON", () => {
			const json = exportApplicationPacketToJson(mockJobApplication);
			const parsed = JSON.parse(json);

			expect(parsed.id).toBe("job-123");
			expect(parsed.company).toBe("Acme Inc");
			expect(parsed.title).toBe("Staff Engineer");
			expect(parsed.fitBrief).toBeDefined();
			expect(parsed.fitBrief.roleSummary).toContain("Leading frontend");
			expect(parsed.resumeEditProposals).toHaveLength(1);
			expect(parsed.coverLetterDraft).toBeDefined();
			expect(parsed.tailoredResume).toBeDefined();

			// Verify formatting (indented with 2 spaces)
			expect(json).toContain('  "id": "job-123",');
		});
	});
});
