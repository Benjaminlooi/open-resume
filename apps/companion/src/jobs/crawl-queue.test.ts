import { afterEach, describe, expect, it, vi } from "vitest";
import { createCrawlQueue } from "./crawl-queue.js";
import { createJobRepository } from "./repository.js";

describe("crawl queue", () => {
	const repositories: Array<ReturnType<typeof createJobRepository>> = [];

	afterEach(() => {
		for (const repository of repositories) {
			repository.close();
		}
		repositories.length = 0;
		vi.restoreAllMocks();
	});

	function createTestRepository() {
		const repository = createJobRepository(":memory:");
		repositories.push(repository);
		return repository;
	}

	it("marks a job ready when crawling succeeds", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Build useful software.",
				extractedAt: 1200,
			}),
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawlError: null,
			cleanedText: "Build useful software.",
			crawledAt: 1200,
		});
	});

	it("marks a job failed when crawling throws", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => {
				throw new Error("Blocked by site");
			},
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError: "Blocked by site",
		});
	});

	it("logs ordinary crawl failures with job context", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const logger = {
			error: vi.fn(),
		};
		const queue = createCrawlQueue({
			repository,
			crawl: async () => {
				throw new Error("Blocked by site");
			},
			logger,
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(logger.error).toHaveBeenCalledWith(
			{
				error: "Blocked by site",
				jobId: "job-1",
				sourceUrl: "https://example.com/job",
			},
			"crawl queue job failed",
		);
	});

	it("marks a job failed when crawling returns empty text", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "   ",
				extractedAt: 1200,
			}),
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError: "Crawl completed but no useful text was found.",
		});
	});

	it("does not recreate a deleted job after crawl completion", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => {
				repository.deleteJob("job-1");
				return {
					sourceUrl: "https://example.com/job",
					cleanedText: "Late result",
					extractedAt: 1300,
				};
			},
			now: () => 1300,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toBeNull();
	});

	it("clears active job state when marking crawling fails", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const crawl = vi.fn(async () => ({
			sourceUrl: "https://example.com/job",
			cleanedText: "Recovered result",
			extractedAt: 1400,
		}));
		const queue = createCrawlQueue({
			repository,
			crawl,
			now: () => 1400,
		});
		const markCrawling = repository.markCrawling;
		repository.markCrawling = vi.fn(() => {
			throw new Error("Database busy");
		});

		await queue.runJob("job-1");

		repository.markCrawling = markCrawling;
		await queue.runJob("job-1");

		expect(crawl).toHaveBeenCalledTimes(1);
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawlError: null,
			cleanedText: "Recovered result",
			crawledAt: 1400,
		});
	});

	it("runs a job only once concurrently and clears active state afterward", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		let resolveCrawl: any;
		const crawlResult = new Promise<{
			sourceUrl: string;
			cleanedText: string;
			extractedAt: number;
		}>((resolve) => {
			resolveCrawl = resolve;
		});
		const crawl = vi.fn(() => crawlResult);
		const queue = createCrawlQueue({
			repository,
			crawl,
			now: () => 1500,
		});

		const firstRun = queue.runJob("job-1");
		const secondRun = queue.runJob("job-1");

		expect(crawl).toHaveBeenCalledTimes(1);

		resolveCrawl?.({
			sourceUrl: "https://example.com/job",
			cleanedText: "First result",
			extractedAt: 1500,
		});
		await Promise.all([firstRun, secondRun]);

		repository.resetForRetry("job-1", 1600);
		await queue.runJob("job-1");

		expect(crawl).toHaveBeenCalledTimes(2);
	});

	it("does nothing for missing or ready jobs", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		repository.markReady("job-1", {
			cleanedText: "Already done",
			now: 1100,
		});
		const crawl = vi.fn(async () => ({
			sourceUrl: "https://example.com/job",
			cleanedText: "Should not run",
			extractedAt: 1200,
		}));
		const queue = createCrawlQueue({
			repository,
			crawl,
			now: () => 1200,
		});

		await queue.runJob("missing-job");
		await queue.runJob("job-1");

		expect(crawl).not.toHaveBeenCalled();
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			cleanedText: "Already done",
			crawledAt: 1100,
		});
	});

	it("enqueues only runnable jobs", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "pending-job",
			sourceUrl: "https://example.com/pending",
			now: 1000,
		});
		repository.createJob({
			id: "crawling-job",
			sourceUrl: "https://example.com/crawling",
			now: 1100,
		});
		repository.markCrawling("crawling-job", 1200);
		repository.createJob({
			id: "ready-job",
			sourceUrl: "https://example.com/ready",
			now: 1300,
		});
		repository.markReady("ready-job", {
			cleanedText: "Done",
			now: 1400,
		});
		repository.createJob({
			id: "failed-job",
			sourceUrl: "https://example.com/failed",
			now: 1500,
		});
		repository.markFailed("failed-job", {
			error: "Nope",
			now: 1600,
		});
		const crawl = vi.fn(async (sourceUrl: string) => ({
			sourceUrl,
			cleanedText: `Text for ${sourceUrl}`,
			extractedAt: 1700,
		}));
		const queue = createCrawlQueue({
			repository,
			crawl,
			now: () => 1700,
		});

		queue.enqueueRunnableJobs();
		await vi.waitFor(() => expect(crawl).toHaveBeenCalledTimes(2));

		expect(crawl).toHaveBeenCalledWith("https://example.com/pending");
		expect(crawl).toHaveBeenCalledWith("https://example.com/crawling");
		expect(crawl).not.toHaveBeenCalledWith("https://example.com/ready");
		expect(crawl).not.toHaveBeenCalledWith("https://example.com/failed");
	});

	it("swallows unexpected enqueue rejections", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		repository.markFailed = vi.fn(() => {
			throw new Error("Failed state unavailable");
		});
		const logger = {
			error: vi.fn(),
		};
		const queue = createCrawlQueue({
			repository,
			crawl: async () => {
				throw new Error("Crawler crashed");
			},
			logger,
			now: () => 1200,
		});

		queue.enqueue("job-1");
		await vi.waitFor(() => expect(logger.error).toHaveBeenCalledTimes(2));
		expect(logger.error).toHaveBeenLastCalledWith(
			{ error: expect.any(Error) },
			"crawl queue job crashed",
		);
	});
});
