import { generateText } from "ai";
import { describe, expect, it, vi } from "vitest";
import {
	buildCoverLetterPrompt,
	buildJobAnalysisPrompt,
	buildResumeTailoringPrompt,
	generateCoverLetter,
	generateJobFitBrief,
	generateResumeTailoring,
	getModel,
	parseBulletsFromDescription,
	parseCoverLetterDraft,
	parseJobFitBrief,
	parseResumeEditProposals,
} from "./job-ai";
import type { JobApplication, JobFitBrief } from "./job-application-schema";
import type { Resume } from "#/lib/resume-schema";

vi.mock("ai", () => ({
	generateText: vi.fn(),
}));

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

describe("Prompt builders", () => {
	it("builds job analysis prompt correctly", () => {
		const prompt = buildJobAnalysisPrompt(mockJob, mockResume);
		expect(prompt).toContain("NextGen Inc");
		expect(prompt).toContain("Senior React Developer");
		expect(prompt).toContain("Jane Doe");
		expect(prompt).toContain("roleSummary");
	});

	it("builds resume tailoring prompt correctly", () => {
		const prompt = buildResumeTailoringPrompt(
			mockJob,
			mockFitBrief,
			mockResume,
		);
		expect(prompt).toContain("NextGen Inc");
		expect(prompt).toContain("exp-1");
		expect(prompt).toContain("skills-1");
		expect(prompt).toContain("proj-1");
		expect(prompt).toContain("proposals");
		expect(prompt).toContain("Built awesome features");
		expect(prompt).toContain("Improved performance");
	});

	it("builds cover letter prompt correctly", () => {
		const prompt = buildCoverLetterPrompt(mockJob, mockFitBrief, mockResume);
		expect(prompt).toContain("NextGen Inc");
		expect(prompt).toContain("Senior React Developer");
		expect(prompt).toContain("cover letter");
	});
});

describe("parseBulletsFromDescription", () => {
	it("extracts bullets from standard ul/li tags", () => {
		const html = "<ul><li>Bullet 1</li><li>Bullet 2</li></ul>";
		const result = parseBulletsFromDescription(html);
		expect(result).toEqual(["Bullet 1", "Bullet 2"]);
	});

	it("handles multi-line and attribute nested li tags", () => {
		const html = `<li class="item">
			First item
		</li><li id="two">Second item</li>`;
		const result = parseBulletsFromDescription(html);
		expect(result).toEqual(["First item", "Second item"]);
	});

	it("returns empty array for empty or missing description", () => {
		expect(parseBulletsFromDescription(undefined)).toEqual([]);
		expect(parseBulletsFromDescription("Just plain text without li")).toEqual(
			[],
		);
	});
});

describe("parseJobFitBrief", () => {
	it("parses valid JobFitBrief JSON block", () => {
		const rawJson = `
		\`\`\`json
		{
			"roleSummary": "A great role",
			"requirements": ["React", "TypeScript"],
			"keywords": ["React", "TS"],
			"strengths": ["React skills"],
			"gaps": ["Backend"],
			"risks": ["Mismatched timeline"],
			"nextActions": ["Review CSS"]
		}
		\`\`\`
		`;
		const result = parseJobFitBrief(rawJson);
		expect(result.roleSummary).toBe("A great role");
		expect(result.requirements).toContain("React");
		expect(result.generatedAt).toBeLessThanOrEqual(Date.now());
		expect(result.generatedAt).toBeGreaterThan(0);
	});

	it("throws error for invalid JSON", () => {
		const badJson = `{ malformed json... }`;
		expect(() => parseJobFitBrief(badJson)).toThrow();
	});

	it("throws error for missing fields in Zod schema", () => {
		const incompleteJson = `{ "roleSummary": "Missing other fields" }`;
		expect(() => parseJobFitBrief(incompleteJson)).toThrow();
	});
});

describe("parseResumeEditProposals", () => {
	it("parses valid tailoring proposals JSON block", () => {
		const rawJson = `
		{
			"proposals": [
				{
					"target": { "section": "summary" },
					"currentText": "Experienced software engineer specializing in frontend.",
					"suggestedText": "Tailored React Frontend Engineer.",
					"rationale": "Tailors the summary for React focus"
				},
				{
					"target": { "section": "experience", "itemId": "exp-1", "field": "role" },
					"currentText": "Software Engineer",
					"suggestedText": "React Software Engineer",
					"rationale": "Emphasizes React"
				},
				{
					"target": { "section": "experience", "itemId": "exp-1", "field": "bullet", "bulletIndex": 1 },
					"currentText": "Improved performance",
					"suggestedText": "Improved performance by 30%",
					"rationale": "Quantifies impact"
				}
			]
		}
		`;
		const result = parseResumeEditProposals(rawJson, mockResume);
		expect(result).toHaveLength(3);
		expect(result[0].id).toBeDefined();
		expect(result[0].status).toBe("pending");
		expect(result[0].createdAt).toBeLessThanOrEqual(Date.now());
		expect(result[0].target.section).toBe("summary");
		expect(result[1].target).toEqual({
			section: "experience",
			itemId: "exp-1",
			field: "role",
		});
		expect(result[2].target).toEqual({
			section: "experience",
			itemId: "exp-1",
			field: "bullet",
			bulletIndex: 1,
		});
	});

	it("throws error when experience item ID does not exist", () => {
		const rawJson = `
		{
			"proposals": [
				{
					"target": { "section": "experience", "itemId": "non-existent-id", "field": "role" },
					"currentText": "Software Engineer",
					"suggestedText": "React Software Engineer",
					"rationale": "Emphasizes React"
				}
			]
		}
		`;
		expect(() => parseResumeEditProposals(rawJson, mockResume)).toThrow(
			"Target experience item with ID 'non-existent-id' not found in resume.",
		);
	});

	it("throws error when experience bullet index is out of bounds", () => {
		const rawJson = `
		{
			"proposals": [
				{
					"target": { "section": "experience", "itemId": "exp-1", "field": "bullet", "bulletIndex": 5 },
					"currentText": "Blah",
					"suggestedText": "New Blah",
					"rationale": "Better wording"
				}
			]
		}
		`;
		expect(() => parseResumeEditProposals(rawJson, mockResume)).toThrow(
			"Bullet index 5 out of bounds for experience item 'exp-1'",
		);
	});

	it("throws error when skills item ID does not exist", () => {
		const rawJson = `
		{
			"proposals": [
				{
					"target": { "section": "skills", "itemId": "non-existent-id", "field": "items" },
					"currentText": "JS",
					"suggestedText": "React, JS",
					"rationale": "Add React"
				}
			]
		}
		`;
		expect(() => parseResumeEditProposals(rawJson, mockResume)).toThrow(
			"Target skills item with ID 'non-existent-id' not found in resume.",
		);
	});

	it("throws error when projects item ID does not exist", () => {
		const rawJson = `
		{
			"proposals": [
				{
					"target": { "section": "projects", "itemId": "non-existent-id", "field": "description" },
					"currentText": "Open source",
					"suggestedText": "React open source",
					"rationale": "Focus on React"
				}
			]
		}
		`;
		expect(() => parseResumeEditProposals(rawJson, mockResume)).toThrow(
			"Target project item with ID 'non-existent-id' not found in resume.",
		);
	});
});

describe("parseCoverLetterDraft", () => {
	it("parses valid Cover Letter JSON block", () => {
		const rawJson = `
		\`\`\`json
		{
			"content": "Dear Hiring Manager,\\n\\nI am writing to express my interest..."
		}
		\`\`\`
		`;
		const result = parseCoverLetterDraft(rawJson);
		expect(result.content).toContain("Dear Hiring Manager");
		expect(result.generatedAt).toBeLessThanOrEqual(Date.now());
		expect(result.updatedAt).toBeLessThanOrEqual(Date.now());
	});

	it("throws error for malformed cover letter JSON", () => {
		const badJson = `{ "content": `;
		expect(() => parseCoverLetterDraft(badJson)).toThrow();
	});
});

describe("getModel", () => {
	it("returns model for openai", () => {
		const model = getModel({ provider: "openai", apiKey: "key" });
		expect(model).toBeDefined();
	});

	it("throws if apiKey is missing for openai", () => {
		expect(() => getModel({ provider: "openai" })).toThrow(
			"API Key is missing for provider 'openai'",
		);
	});

	it("does not throw for local providers if baseUrl and modelName are provided", () => {
		const model = getModel({
			provider: "ollama",
			baseUrl: "http://localhost:11434",
			modelName: "llama3",
		});
		expect(model).toBeDefined();
	});

	it("throws if baseUrl or modelName is missing for local provider", () => {
		expect(() =>
			getModel({
				provider: "ollama",
			}),
		).toThrow(
			"Base URL and Model name are required for local provider 'ollama'",
		);
	});
});

describe("generate functions", () => {
	it("calls generateText and returns parsed job fit brief", async () => {
		const mockText = JSON.stringify({
			roleSummary: "Mock summary",
			requirements: ["Req 1"],
			keywords: ["Key 1"],
			strengths: ["Strength 1"],
			gaps: ["Gap 1"],
			risks: ["Risk 1"],
			nextActions: ["Action 1"],
		});
		vi.mocked(generateText).mockResolvedValueOnce({
			text: mockText,
		} as unknown as Awaited<ReturnType<typeof generateText>>);

		const config = { provider: "openai" as const, apiKey: "test-key" };
		const result = await generateJobFitBrief(config, mockJob, mockResume);

		expect(generateText).toHaveBeenCalled();
		expect(result.roleSummary).toBe("Mock summary");
	});

	it("calls generateText and returns parsed proposals", async () => {
		const mockText = JSON.stringify({
			proposals: [
				{
					target: { section: "summary" },
					currentText:
						"Experienced software engineer specializing in frontend.",
					suggestedText: "Tailored React Frontend Engineer.",
					rationale: "Tailors the summary for React focus",
				},
			],
		});
		vi.mocked(generateText).mockResolvedValueOnce({
			text: mockText,
		} as unknown as Awaited<ReturnType<typeof generateText>>);

		const config = { provider: "openai" as const, apiKey: "test-key" };
		const result = await generateResumeTailoring(
			config,
			mockJob,
			mockFitBrief,
			mockResume,
		);

		expect(generateText).toHaveBeenCalled();
		expect(result).toHaveLength(1);
		expect(result[0].suggestedText).toBe("Tailored React Frontend Engineer.");
	});

	it("calls generateText and returns parsed cover letter", async () => {
		const mockText = JSON.stringify({
			content: "Dear Team,\\n\\nI would love to join NextGen Inc...",
		});
		vi.mocked(generateText).mockResolvedValueOnce({
			text: mockText,
		} as unknown as Awaited<ReturnType<typeof generateText>>);

		const config = { provider: "openai" as const, apiKey: "test-key" };
		const result = await generateCoverLetter(
			config,
			mockJob,
			mockFitBrief,
			mockResume,
		);

		expect(generateText).toHaveBeenCalled();
		expect(result.content).toContain("Dear Team");
	});
});
