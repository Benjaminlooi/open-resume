import { describe, expect, it } from "vitest";
import { normalizePlaywrightExtraction } from "./playwright.js";

describe("normalizePlaywrightExtraction", () => {
	it("returns readable text from rendered html", () => {
		const result = normalizePlaywrightExtraction({
			sourceUrl: "https://example.com/job",
			html: "<main><h1>AI Engineer</h1><p>Build hiring tools.</p></main>",
		});

		expect(result.description).toContain("AI Engineer");
		expect(result.description).toContain("Build hiring tools.");
		expect(result.extractionMethod).toBe("playwright");
	});
});
