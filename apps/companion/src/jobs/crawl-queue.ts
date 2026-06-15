import type { AIConfig } from "../config.js";
import type { CleanedPageCrawlResult } from "../extract/playwright.js";
import { crawlCleanedTextWithPlaywright } from "../extract/playwright.js";
import { analyzeJobPosting } from "./ai-analyzer.js";
import type { JobRepository } from "./repository.js";

interface CrawlQueueLogger {
	error(bindings: Record<string, unknown>, message: string): void;
}

interface CrawlQueueOptions {
	repository: JobRepository;
	crawl?: (sourceUrl: string, jobId: string) => Promise<CleanedPageCrawlResult>;
	logger?: CrawlQueueLogger;
	now?: () => number;
	profilePath?: string;
	resumePath?: string;
	analyze?: typeof analyzeJobPosting;
	aiConfig?: AIConfig;
}

export function createCrawlQueue(options: CrawlQueueOptions) {
	const crawl = options.crawl ?? crawlCleanedTextWithPlaywright;
	const analyze = options.analyze ?? analyzeJobPosting;
	const now = options.now ?? Date.now;
	const activeJobs = new Set<string>();

	async function runJob(id: string) {
		if (activeJobs.has(id)) return;
		const job = options.repository.getJob(id);
		if (!job || job.crawlStatus === "ready") return;

		activeJobs.add(id);

		try {
			let cleanedText: string;
			let result: CleanedPageCrawlResult | undefined;

			if (job.cleanedText && job.cleanedText.trim()) {
				cleanedText = job.cleanedText.trim();
			} else {
				options.repository.markCrawling(id, now());
				result = await crawl(job.sourceUrl, id);
				cleanedText = result.cleanedText.trim();
				if (!cleanedText) {
					throw new Error("Crawl completed but no useful text was found.");
				}
			}

			if (options.repository.getJob(id)) {
				options.repository.markAnalyzing(id, cleanedText, now());
				const defaultResume = options.repository.getDefaultResume();
				if (!defaultResume && !options.resumePath) {
					throw new Error(
						"Synced default resume not found. Please sync your resume in the settings panel.",
					);
				}

				const aiResult = await analyze({
					profilePath: options.profilePath ?? "",
					...(defaultResume
						? { resumeContent: JSON.stringify(defaultResume.content) }
						: { resumePath: options.resumePath }),
					cleanedText,
					aiConfig: options.aiConfig!,
				});

				const currentJob = options.repository.getJob(id);
				if (currentJob) {
					options.repository.markReady(id, {
						cleanedText,
						parsedTitle: aiResult.title,
						parsedCompany: aiResult.company,
						parsedLocation: aiResult.location,
						parsedDescription: aiResult.description,
						fitScore: aiResult.fitScore,
						fitBriefJson: JSON.stringify(aiResult.fitBrief),
						now: currentJob.crawledAt || result?.extractedAt || now(),
					});
				}
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			options.logger?.error(
				{ error: errorMessage, jobId: id, sourceUrl: job.sourceUrl },
				"crawl queue job failed",
			);
			if (options.repository.getJob(id)) {
				options.repository.markFailed(id, {
					error: errorMessage,
					now: now(),
				});
			}
		} finally {
			activeJobs.delete(id);
		}
	}

	function enqueue(id: string) {
		void runJob(id).catch((error) => {
			options.logger?.error({ error }, "crawl queue job crashed");
		});
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
