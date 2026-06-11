import { writeFileSync, unlinkSync } from "node:fs";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

	beforeEach(() => {
		writeFileSync(mockProfilePath, JSON.stringify({ name: "Bob", targetRoles: { primary: ["Staff Engineer"] } }));
		writeFileSync(mockResumePath, JSON.stringify({ resume: "details" }));
		lastGenerateObjectArgs = null;
		// Clean up env variables
		delete process.env.OPEN_RESUME_COMPANION_AI_PROVIDER;
		delete process.env.OPENAI_API_KEY;
		delete process.env.GEMINI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.DEEPSEEK_API_KEY;
		delete process.env.OPENAI_MODEL;
		delete process.env.GEMINI_MODEL;
		delete process.env.ANTHROPIC_MODEL;
		delete process.env.DEEPSEEK_MODEL;
	});

	afterEach(() => {
		try { unlinkSync(mockProfilePath); } catch {}
		try { unlinkSync(mockResumePath); } catch {}
	});

	describe("File Validations", () => {
		it("should throw a descriptive error if candidate profile does not exist", async () => {
			await expect(
				analyzeJobPosting({
					profilePath: "nonexistent-profile.json",
					resumePath: mockResumePath,
					cleanedText: "Some job posting content",
				}),
			).rejects.toThrow("Candidate profile not found. Please set up your profile in the settings panel.");
		});

		it("should throw a descriptive error if default resume does not exist", async () => {
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: "nonexistent-resume.json",
					cleanedText: "Some job posting content",
				}),
			).rejects.toThrow("Synced default resume not found. Please sync your resume in the settings panel.");
		});

		it("should throw if profile is empty", async () => {
			writeFileSync(mockProfilePath, "");
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Some job posting content",
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
				}),
			).rejects.toThrow("Synced default resume is empty.");
		});
	});

	describe("Provider Configuration & Resolution", () => {
		it("should use openai by default if no provider is configured, throwing if API key is missing", async () => {
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Job posting text",
				}),
			).rejects.toThrow("OPENAI_API_KEY environment variable is not set.");
		});

		it("should resolve openai provider and default model if key is present", async () => {
			process.env.OPENAI_API_KEY = "sk-test-openai";
			const result = await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
			});

			expect(result.title).toBe("Mocked Staff Engineer");
			expect(lastGenerateObjectArgs.model).toEqual({
				provider: "openai",
				modelName: "gpt-4o-mini",
				config: { apiKey: "sk-test-openai" },
			});
			expect(lastGenerateObjectArgs.system).toContain("Candidate Profile");
			expect(lastGenerateObjectArgs.prompt).toContain("Job posting text");
		});

		it("should use custom model name if specified for openai", async () => {
			process.env.OPENAI_API_KEY = "sk-test-openai";
			process.env.OPENAI_MODEL = "gpt-4o";
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
			});

			expect(lastGenerateObjectArgs.model.modelName).toBe("gpt-4o");
		});

		it("should resolve google provider and throw if GEMINI_API_KEY is missing", async () => {
			process.env.OPEN_RESUME_COMPANION_AI_PROVIDER = "google";
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Job posting text",
				}),
			).rejects.toThrow("GEMINI_API_KEY environment variable is not set.");
		});

		it("should resolve google provider if key is present", async () => {
			process.env.OPEN_RESUME_COMPANION_AI_PROVIDER = "google";
			process.env.GEMINI_API_KEY = "gemini-test-key";
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
			});

			expect(lastGenerateObjectArgs.model).toEqual({
				provider: "google",
				modelName: "gemini-1.5-flash",
				config: { apiKey: "gemini-test-key" },
			});
		});

		it("should resolve anthropic provider and throw if ANTHROPIC_API_KEY is missing", async () => {
			process.env.OPEN_RESUME_COMPANION_AI_PROVIDER = "anthropic";
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Job posting text",
				}),
			).rejects.toThrow("ANTHROPIC_API_KEY environment variable is not set.");
		});

		it("should resolve anthropic provider if key is present", async () => {
			process.env.OPEN_RESUME_COMPANION_AI_PROVIDER = "anthropic";
			process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
			});

			expect(lastGenerateObjectArgs.model).toEqual({
				provider: "anthropic",
				modelName: "claude-3-5-haiku-latest",
				config: { apiKey: "anthropic-test-key" },
			});
		});

		it("should resolve deepseek provider and throw if DEEPSEEK_API_KEY is missing", async () => {
			process.env.OPEN_RESUME_COMPANION_AI_PROVIDER = "deepseek";
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Job posting text",
				}),
			).rejects.toThrow("DEEPSEEK_API_KEY environment variable is not set.");
		});

		it("should resolve deepseek provider via createOpenAI helper if key is present", async () => {
			process.env.OPEN_RESUME_COMPANION_AI_PROVIDER = "deepseek";
			process.env.DEEPSEEK_API_KEY = "deepseek-test-key";
			await analyzeJobPosting({
				profilePath: mockProfilePath,
				resumePath: mockResumePath,
				cleanedText: "Job posting text",
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

		it("should throw if an unsupported provider is configured", async () => {
			process.env.OPEN_RESUME_COMPANION_AI_PROVIDER = "unsupported";
			await expect(
				analyzeJobPosting({
					profilePath: mockProfilePath,
					resumePath: mockResumePath,
					cleanedText: "Job posting text",
				}),
			).rejects.toThrow("Unsupported AI provider: unsupported");
		});
	});
});
