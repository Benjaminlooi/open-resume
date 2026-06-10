import { describe, expect, it } from "vitest";
import { normalizeExtraction } from "./normalize.js";

describe("normalizeExtraction", () => {
	it("uses structured fields when available", () => {
		const result = normalizeExtraction({
			sourceUrl: "https://example.com/job",
			rawText: "Fallback text",
			method: "json-ld",
			structured: {
				title: "Product Engineer",
				company: "Example",
				location: "Remote",
				description: "Ship product features.",
			},
		});

		expect(result.title).toBe("Product Engineer");
		expect(result.company).toBe("Example");
		expect(result.location).toBe("Remote");
		expect(result.description).toBe("Ship product features.");
	});

	it("falls back to raw text when structured fields are missing", () => {
		const result = normalizeExtraction({
			sourceUrl: "https://example.com/job",
			rawText: "Senior Designer at Example. Design practical workflows.",
			method: "readability",
			structured: null,
		});

		expect(result.title).toBe("");
		expect(result.company).toBe("");
		expect(result.location).toBe("");
		expect(result.description).toBe(
			"Senior Designer at Example. Design practical workflows.",
		);
	});
});
