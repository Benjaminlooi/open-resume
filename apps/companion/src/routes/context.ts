import type { CrawlQueue } from "../job-postings/crawl-queue.js";
import type { JobRepository } from "../job-postings/repository.js";

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

export interface JobApplicationRouteContext {
	jobRepository: JobRepository;
}
