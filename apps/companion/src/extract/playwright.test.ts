import { describe, expect, it } from "vitest";
import {
	crawlCleanedTextWithPlaywright,
	normalizePlaywrightCrawl,
} from "./playwright.js";

describe("normalizePlaywrightCrawl", () => {
	it("returns cleaned text from rendered html without semantic parsing", () => {
		const result = normalizePlaywrightCrawl({
			sourceUrl: "https://example.com/job",
			html: `
				<html>
					<head><style>.hidden { display: none; }</style></head>
					<body>
						<nav>Site navigation</nav>
						<main><h1>AI Engineer</h1><p>Build hiring tools.</p></main>
						<script type="application/ld+json">
							{
								"@context": "https://schema.org",
								"@type": "JobPosting",
								"title": "Misleading Semantic Title",
								"hiringOrganization": {
									"name": "Semantic Corp"
								},
								"jobLocation": {
									"address": {
										"addressLocality": "Remote",
										"addressCountry": "US"
									}
								}
							}
						</script>
						<script>window.analytics = true;</script>
					</body>
				</html>
			`,
		});

		expect(result.sourceUrl).toBe("https://example.com/job");
		expect(result.cleanedText).toContain("AI Engineer");
		expect(result.cleanedText).toContain("Build hiring tools.");
		expect(result.cleanedText).not.toContain("window.analytics");
		expect(result.extractedAt).toEqual(expect.any(Number));
		expect("title" in result).toBe(false);
		expect("company" in result).toBe(false);
		expect("location" in result).toBe(false);
		expect("description" in result).toBe(false);
	});
});

describe("crawlCleanedTextWithPlaywright", () => {
	it("extracts cleaned content from both main page and iframes", async () => {
		const iframeContent = `
			<html>
				<body>
					<h2>Inside Iframe</h2>
					<p>Awesome design role.</p>
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

		const result = await crawlCleanedTextWithPlaywright(dataUrl);

		expect(result.cleanedText).toContain("Main Job Title");
		expect(result.cleanedText).toContain("Inside Iframe");
		expect(result.cleanedText).toContain("Awesome design role.");
	}, 20000);
});
