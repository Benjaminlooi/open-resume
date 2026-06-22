import { chromium, type Page } from "playwright";
import { extractReadableText } from "./html.js";

interface ExtractionLogger {
	debug(bindings: Record<string, unknown>, message: string): void;
	error(bindings: Record<string, unknown>, message: string): void;
}

interface ExtractionLogOptions {
	logger?: ExtractionLogger;
	logScrapedData?: boolean;
	headless?: boolean;
	screenshotPath?: string;
}

export interface CleanedPageCrawlResult {
	sourceUrl: string;
	cleanedText: string;
	extractedAt: number;
}

export function normalizePlaywrightCrawl(input: {
	sourceUrl: string;
	html: string;
	logger?: ExtractionLogger;
	logScrapedData?: boolean;
}): CleanedPageCrawlResult {
	const cleanedText = extractReadableText(input.html).trim();

	if (input.logScrapedData) {
		input.logger?.debug(
			{ url: input.sourceUrl, cleanedText },
			"scraped text after cleanup",
		);
	}

	return {
		sourceUrl: input.sourceUrl,
		cleanedText,
		extractedAt: Date.now(),
	};
}

export async function crawlCleanedTextWithPlaywright(
	sourceUrl: string,
	options: ExtractionLogOptions = {},
): Promise<CleanedPageCrawlResult> {
	const browser = await chromium.launch({ headless: options.headless ?? true });
	let page: Page | null = null;
	let screenshotTaken = false;

	try {
		page = await browser.newPage();
		await page.goto(sourceUrl, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await page
			.waitForLoadState("networkidle", { timeout: 10000 })
			.catch(() => {});

		// Take screenshot on successful load before reading frames
		if (options.screenshotPath) {
			try {
				await page.screenshot({ path: options.screenshotPath, fullPage: true });
				screenshotTaken = true;
			} catch (err) {
				options.logger?.error(
					{ error: err instanceof Error ? err.message : String(err) },
					"failed to save screenshot on success",
				);
			}
		}

		let html = await page.content();

		for (const frame of page.frames()) {
			if (frame !== page.mainFrame()) {
				try {
					const frameContent = await frame.content();
					html += `\n<!-- FRAME: ${frame.url()} -->\n${frameContent}`;
				} catch {
					// Ignore frames that cannot be read.
				}
			}
		}

		return normalizePlaywrightCrawl({
			sourceUrl,
			html,
			logger: options.logger,
			logScrapedData: options.logScrapedData,
		});
	} catch (error) {
		// Capture screenshot of the error state (e.g. CAPTCHA page) if page is initialized
		if (page && options.screenshotPath && !screenshotTaken) {
			try {
				await page.screenshot({ path: options.screenshotPath, fullPage: true });
			} catch {
				// Ignore secondary screenshot errors on fail
			}
		}
		throw error;
	} finally {
		await browser.close();
	}
}
