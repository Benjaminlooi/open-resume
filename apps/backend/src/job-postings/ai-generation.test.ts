import { describe, expect, it, vi } from "vitest";
import { generateJobFitBrief } from "./ai-generation.js";

vi.mock("@ai-sdk/openai", () => ({
	createOpenAI: vi.fn().mockImplementation(() => {
		return () => ({});
	}),
}));

vi.mock("ai", () => ({
	generateText: vi.fn().mockResolvedValue({
		text: JSON.stringify({
			roleSummary: "Great role",
			requirements: ["Skill A"],
			keywords: ["A"],
			strengths: ["Strong match"],
			gaps: [],
			risks: [],
			nextActions: ["Apply"],
		}),
	}),
}));

describe("ai-generation", () => {
	it("generates job fit brief correctly", async () => {
		const brief = await generateJobFitBrief(
			{ provider: "openai", apiKey: "test", modelName: "gpt-4o-mini" },
			{
				id: "job-1",
				company: "Company",
				title: "Title",
				location: "Remote",
				sourceUrl: "https://example.com/job",
				description: "Job desc",
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
			},
			{
				personalInfo: { fullName: "Jane Doe", email: "", phone: "", location: "", contactLinks: [] },
				summary: "Experienced developer",
				sections: [],
				experience: [],
				education: [],
				skills: [],
				projects: [],
				certifications: [],
				languages: [],
			}
		);
		expect(brief.roleSummary).toBe("Great role");
	});
});
