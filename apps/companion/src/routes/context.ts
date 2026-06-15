import type { CrawlQueue } from "../jobs/crawl-queue.js";
import type { JobRepository } from "../jobs/repository.js";

export interface ProfileRouteContext {
	jobRepository: JobRepository;
	getProfilePath(): string;
}

export interface ResumeRouteContext {
	jobRepository: JobRepository;
}

export interface JobRouteContext {
	jobRepository: JobRepository;
	crawlQueue: CrawlQueue;
	screenshotsPath: string;
}
