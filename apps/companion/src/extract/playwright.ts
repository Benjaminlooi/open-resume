import { chromium } from "playwright";
import type { JobExtractionResult } from "../schema.js";
import { extractReadableText } from "./html.js";
import { extractJobPostingJsonLd } from "./json-ld.js";
import { normalizeExtraction } from "./normalize.js";

export function normalizePlaywrightExtraction(input: {
	sourceUrl: string;
	html: string;
}): JobExtractionResult {
	const rawText = extractReadableText(input.html);
	const structured = extractJobPostingJsonLd(input.html);

	return normalizeExtraction({
		sourceUrl: input.sourceUrl,
		rawText,
		method: "playwright",
		structured,
	});
}

export async function extractWithPlaywright(
	sourceUrl: string,
): Promise<JobExtractionResult> {
	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage();
		await page.goto(sourceUrl, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		const html = await page.content();
		return normalizePlaywrightExtraction({ sourceUrl, html });
	} finally {
		await browser.close();
	}
}
