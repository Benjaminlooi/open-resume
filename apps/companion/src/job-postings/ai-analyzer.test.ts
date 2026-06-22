import { unlinkSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeJobPosting } from "./ai-analyzer.js";

vi.mock("@ai-sdk/openai", () => ({
	createOpenAI: vi.fn().mockImplementation((config) => {
		const modelFn = (modelName: string) => ({
			provider: "openai",
			modelName,
			config,
		});
		return modelFn;
	}),
}));

vi.mock("@ai-sdk/google", () => ({
	createGoogleGenerativeAI: vi.fn().mockImplementation((config) => {
		const modelFn = (modelName: string) => ({
			provider: "google",
			modelName,
			config,
		});
		return modelFn;
	}),
}));

vi.mock("@ai-sdk/anthropic", () => ({
	createAnthropic: vi.fn().mockImplementation((config) => {
		const modelFn = (modelName: string) => ({
			provider: "anthropic",
			modelName,
			config,
		});
		return modelFn;
	}),
}));

// Mock generateObject
let lastGenerateObjectArgs: any = null;
vi.mock("ai", () => ({
	generateObject: vi.fn().mockImplementation(async (args) => {
		lastGenerateObjectArgs = args;
		return {
			object: {
				title: "Mocked Staff Engineer",
				company: "Mocked Acme Corp",
				location: "Remote",
				description: "Mocked job description",
				fitScore: 92,
				fitBrief: {
					roleSummary: "Mocked summary",
					requirements: ["React", "TypeScript"],
					keywords: ["frontend", "staff"],
					strengths: ["Highly aligned experience"],
					gaps: ["No direct management mentioned"],
					risks: ["Fast-paced environment"],
					nextActions: ["Apply through website"],
				},
			},
		};
	}),
}));

describe("analyzeJobPosting", () => {
	const mockProfilePath = "test-profile-temp.json";
	const mockResumePath = "test-resume-temp.json";

	const defaultAiConfig = {
		provider: "openai" as const,
		apiKey: "sk-test-openai",
		modelName: "gpt-4o-mini",
	};

	beforeEach(() => {
		writeFileSync(
			mockProfilePath,
			JSON.stringify({
				name: "Bob",
				targetRoles: { primary: ["Staff Engineer"] },
			}),
		);
		writeFileSync(mockResumePath, JSON.stringify({ resume: "details" }));
		lastGenerateObjectArgs = null;
	});

	afterEach(() => {
		try {
			unlinkSync(mockProfilePath);
		} catch {}
		try {
			unlinkSync(mockResumePath);
		} catch {}
	});

	describe("File Validations", () => {
		it("should throw a descriptive error if candidate profile does not exist", async () => {
			await expect(
				analyzeJobPosting({
					profilePath: "nonexistent-profile.json",
					resumePath: mockResumePath,
					cleanedText: "Some job posting content",
					aiConfig: defaultAiConfig,
				}),
			).rejects.toThrow(
				"Candidate profile not found. Please set up your profile in the settings panel.",
			);
		});

		it("should throw a descriptive error if default resume does not exist", async () => {
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: "nonexistent-resume.json",
					cleanedText: "Some job posting content",
					aiConfig: defaultAiConfig,
				}),
			).rejects.toThrow(
				"Synced default resume not found. Please sync your resume in the settings panel.",
			);
		});

		it("should throw if profile is empty", async () => {
			writeFileSync(mockProfilePath, "");
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Some job posting content",
					aiConfig: defaultAiConfig,
				}),
			).rejects.toThrow("Candidate profile is empty.");
		});

		it("should throw if resume is empty", async () => {
			writeFileSync(mockResumePath, "");
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Some job posting content",
					aiConfig: defaultAiConfig,
				}),
			).rejects.toThrow("Synced default resume is empty.");
		});

		it("should accept direct resume content without requiring a resume file", async () => {
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumeContent: JSON.stringify({ resume: "sqlite details" }),
				cleanedText: "Job posting text",
				aiConfig: defaultAiConfig,
			});

			expect(lastGenerateObjectArgs.system).toContain(
				'{"resume":"sqlite details"}',
			);
		});
	});

	describe("Provider Configuration & Resolution", () => {
		it("should resolve openai provider and model", async () => {
			const result = await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
				aiConfig: {
					provider: "openai",
					apiKey: "openai-test-key",
					modelName: "gpt-4o",
				},
			});

			expect(result.title).toBe("Mocked Staff Engineer");
			expect(lastGenerateObjectArgs.model).toEqual({
				provider: "openai",
				modelName: "gpt-4o",
				config: { apiKey: "openai-test-key" },
			});
			expect(lastGenerateObjectArgs.system).toContain("Candidate Profile");
			expect(lastGenerateObjectArgs.prompt).toContain("Job posting text");
		});

		it("should resolve google provider and model", async () => {
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
				aiConfig: {
					provider: "google",
					apiKey: "gemini-test-key",
					modelName: "gemini-1.5-pro",
				},
			});

			expect(lastGenerateObjectArgs.model).toEqual({
				provider: "google",
				modelName: "gemini-1.5-pro",
				config: { apiKey: "gemini-test-key" },
			});
		});

		it("should resolve anthropic provider and model", async () => {
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
				aiConfig: {
					provider: "anthropic",
					apiKey: "anthropic-test-key",
					modelName: "claude-3-5-sonnet-latest",
				},
			});

			expect(lastGenerateObjectArgs.model).toEqual({
				provider: "anthropic",
				modelName: "claude-3-5-sonnet-latest",
				config: { apiKey: "anthropic-test-key" },
			});
		});

		it("should resolve deepseek provider via createOpenAI helper", async () => {
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
				aiConfig: {
					provider: "deepseek",
					apiKey: "deepseek-test-key",
					modelName: "deepseek-chat",
				},
			});

			expect(lastGenerateObjectArgs.model).toEqual({
				provider: "openai",
				modelName: "deepseek-chat",
				config: {
					apiKey: "deepseek-test-key",
					baseURL: "https://api.deepseek.com/v1",
				},
			});
		});
	});
});
