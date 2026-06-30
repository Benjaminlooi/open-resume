import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveConfig } from "./config.js";

describe("resolveConfig", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.stubEnv("OPENAI_API_KEY", "sk-test-openai");
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.unstubAllEnvs();
	});

	it("resolves default database and file paths when no options are provided", () => {
		const config = resolveConfig({});
		expect(config.databasePath).toContain(".open-resume-backend/jobs.sqlite");
		expect(config.profilePath).toContain(".open-resume-backend/profile.json");
		expect(config.resumePath).toContain(".open-resume-backend/resume.json");
		expect(config.screenshotsPath).toContain(
			".open-resume-backend/screenshots",
		);
		expect(config.logLevel).toBe("info");
		expect(config.ai.provider).toBe("openai");
		expect(config.ai.apiKey).toBe("sk-test-openai");
		expect(config.ai.modelName).toBe("gpt-4o-mini");
		expect(config.headless).toBe(true);
	});

	it("prefers custom options paths over defaults", () => {
		const config = resolveConfig({
			databasePath: "/tmp/custom.db",
			profilePath: "/tmp/profile.json",
			resumePath: "/tmp/resume.json",
		});
		expect(config.databasePath).toBe("/tmp/custom.db");
		expect(config.profilePath).toBe("/tmp/profile.json");
		expect(config.resumePath).toBe("/tmp/resume.json");
	});

	it("throws an error if an invalid log level is provided", () => {
		expect(() => resolveConfig({ logLevel: "invalid-level" as any })).toThrow();
	});

	it("throws an error if the selected provider key is missing", () => {
		vi.unstubAllEnvs(); // Remove OPENAI_API_KEY as well
		vi.stubEnv("OPEN_RESUME_BACKEND_AI_PROVIDER", "google");
		expect(() => resolveConfig({})).toThrow(
			/AI Provider "google" is selected, but its required API key/,
		);
	});

	it("correctly resolves other providers when their key is present", () => {
		vi.stubEnv("OPEN_RESUME_BACKEND_AI_PROVIDER", "google");
		vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
		const config = resolveConfig({});
		expect(config.ai.provider).toBe("google");
		expect(config.ai.apiKey).toBe("gemini-test-key");
		expect(config.ai.modelName).toBe("gemini-3.5-flash");
	});

	it("resolves headless option correctly from options", () => {
		const config = resolveConfig({ headless: false });
		expect(config.headless).toBe(false);
	});

	it("resolves headless option correctly from environment variable", () => {
		vi.stubEnv("OPEN_RESUME_BACKEND_HEADLESS", "false");
		const config1 = resolveConfig({});
		expect(config1.headless).toBe(false);

		vi.stubEnv("OPEN_RESUME_BACKEND_HEADLESS", "0");
		const config2 = resolveConfig({});
		expect(config2.headless).toBe(false);
	});
});
