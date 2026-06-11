import type { CleanedPageCrawlResult } from "../extract/playwright.js";
import { crawlCleanedTextWithPlaywright } from "../extract/playwright.js";
import type { JobRepository } from "./repository.js";

interface CrawlQueueOptions {
	repository: JobRepository;
	crawl?: (sourceUrl: string) => Promise<CleanedPageCrawlResult>;
	now?: () => number;
}

export function createCrawlQueue(options: CrawlQueueOptions) {
	const crawl = options.crawl ?? crawlCleanedTextWithPlaywright;
	const now = options.now ?? Date.now;
	const activeJobs = new Set<string>();

	async function runJob(id: string) {
		if (activeJobs.has(id)) return;
		const job = options.repository.getJob(id);
		if (!job || job.crawlStatus === "ready") return;

		activeJobs.add(id);
		options.repository.markCrawling(id, now());

		try {
			const result = await crawl(job.sourceUrl);
			const cleanedText = result.cleanedText.trim();
			if (!cleanedText) {
				throw new Error("Crawl completed but no useful text was found.");
			}
			if (options.repository.getJob(id)) {
				options.repository.markReady(id, {
					cleanedText,
					now: result.extractedAt,
				});
			}
		} catch (error) {
			if (options.repository.getJob(id)) {
				options.repository.markFailed(id, {
					error: error instanceof Error ? error.message : String(error),
					now: now(),
				});
			}
		} finally {
			activeJobs.delete(id);
		}
	}

	function enqueue(id: string) {
		void runJob(id);
	}

	function enqueueRunnableJobs() {
		for (const job of options.repository.listRunnableJobs()) {
			enqueue(job.id);
		}
	}

	return {
		runJob,
		enqueue,
		enqueueRunnableJobs,
	};
}

export type CrawlQueue = ReturnType<typeof createCrawlQueue>;
