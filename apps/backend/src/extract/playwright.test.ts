import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
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

	it("captures full-page screenshots", async () => {
		const htmlContent = "<html><body><h1>Screenshot Page</h1></body></html>";
		const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
		const screenshotPath = join(
			process.cwd(),
			".open-resume-companion",
			`test-screenshot-${randomUUID()}.png`,
		);

		if (existsSync(screenshotPath)) {
			unlinkSync(screenshotPath);
		}

		try {
			await crawlCleanedTextWithPlaywright(dataUrl, { screenshotPath });
			expect(existsSync(screenshotPath)).toBe(true);
		} finally {
			if (existsSync(screenshotPath)) {
				unlinkSync(screenshotPath);
			}
		}
	}, 20000);
});
