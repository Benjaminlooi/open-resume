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

	it("marks a job failed when crawling throws or returns empty text", async () => {
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
});
