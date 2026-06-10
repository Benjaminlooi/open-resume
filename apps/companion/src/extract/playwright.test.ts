import { describe, expect, it } from "vitest";
import {
	extractWithPlaywright,
	normalizePlaywrightExtraction,
} from "./playwright.js";

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
describe("extractWithPlaywright", () => {
	it("extracts content from both main page and iframes", async () => {
		const iframeContent = `
			<html>
				<body>
					<h2>Inside Iframe</h2>
					<script type="application/ld+json">
						{
							"@context": "https://schema.org",
							"@type": "JobPosting",
							"title": "Founding Designer",
							"hiringOrganization": {
								"name": "DesignCo"
							},
							"jobLocation": {
								"address": {
									"addressLocality": "London",
									"addressCountry": "UK"
								}
							},
							"description": "Awesome design role."
						}
					</script>
				</body>
			</html>
		`;
		const mainContent = `
			<html>
				<body>
					<h1>Main Job Title</h1>
					<iframe src="data:text/html;charset=utf-8,${encodeURIComponent(iframeContent)}"></iframe>
				</body>
			</html>
		`;
		const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(mainContent)}`;

		const result = await extractWithPlaywright(dataUrl);

		expect(result.title).toBe("Founding Designer");
		expect(result.company).toBe("DesignCo");
		expect(result.location).toBe("London, UK");
		expect(result.description).toBe("Awesome design role.");
		expect(result.rawText).toContain("Main Job Title");
		expect(result.rawText).toContain("Inside Iframe");
		expect(result.extractionMethod).toBe("playwright");
	}, 20000);
});
