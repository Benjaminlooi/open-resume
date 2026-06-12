import type { CrawlQueue } from "../jobs/crawl-queue.js";
import type { JobRepository } from "../jobs/repository.js";

export interface CompanionRouteContext {
	jobRepository: JobRepository;
	crawlQueue: CrawlQueue;
	getProfilePath(): string;
}
