import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJobWithLocalCompanion } from "./local-companion-client";

describe("local companion client", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("returns extracted job details from the companion", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					sourceUrl: "https://example.com/job",
					title: "Engineer",
					company: "Example",
					location: "Remote",
					description: "Build software.",
					rawText: "Engineer at Example. Build software.",
					extractionMethod: "json-ld",
					extractedAt: 1791571200000,
				}),
			})),
		);

		const result = await extractJobWithLocalCompanion("https://example.com/job");

		expect(result).toMatchObject({
			title: "Engineer",
			company: "Example",
			description: "Build software.",
		});
	});

	it("returns a user-facing error when the companion is unavailable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);

		await expect(
			extractJobWithLocalCompanion("https://example.com/job"),
		).rejects.toThrow("Local companion is not reachable");
	});
});
