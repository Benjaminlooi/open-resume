import { chromium } from "playwright";
import type { JobExtractionResult } from "../schema.js";
import { extractReadableText } from "./html.js";
import { extractJobPostingJsonLd } from "./json-ld.js";
import { normalizeExtraction } from "./normalize.js";

interface ExtractionLogger {
	debug(bindings: Record<string, unknown>, message: string): void;
}

interface ExtractionLogOptions {
	logger?: ExtractionLogger;
	logScrapedData?: boolean;
}

export function normalizePlaywrightExtraction(input: {
	sourceUrl: string;
	html: string;
	logger?: ExtractionLogger;
	logScrapedData?: boolean;
}): JobExtractionResult {
	const rawText = extractReadableText(input.html);
	const structured = extractJobPostingJsonLd(input.html);

	if (input.logScrapedData) {
		input.logger?.debug(
			{ url: input.sourceUrl, rawText, structured },
			"scraped data before normalization",
		);
	}

	const result = normalizeExtraction({
		sourceUrl: input.sourceUrl,
		rawText,
		method: "playwright",
		structured,
	});

	if (input.logScrapedData) {
		input.logger?.debug(
			{ url: input.sourceUrl, result },
			"scraped data after normalization",
		);
	}

	return result;
}

export async function extractWithPlaywright(
	sourceUrl: string,
	options: ExtractionLogOptions = {},
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
		return normalizePlaywrightExtraction({
			sourceUrl,
			html,
			logger: options.logger,
			logScrapedData: options.logScrapedData,
		});
	} finally {
		await browser.close();
	}
}
