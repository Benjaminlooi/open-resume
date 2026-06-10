import { afterEach, describe, expect, it } from "vitest";
import { createJobRepository } from "./repository.js";

describe("job repository", () => {
	const repositories: Array<ReturnType<typeof createJobRepository>> = [];

	afterEach(() => {
		for (const repository of repositories) {
			repository.close();
		}
		repositories.length = 0;
	});

	function createTestRepository() {
		const repository = createJobRepository(":memory:");
		repositories.push(repository);
		return repository;
	}

	it("creates and lists jobs newest first", () => {
		const repository = createTestRepository();

		const first = repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			now: 1000,
		});
		const second = repository.createJob({
			id: "job-2",
			sourceUrl: "https://example.com/two",
			now: 2000,
		});

		expect(first).toMatchObject({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			crawlStatus: "pending",
			cleanedText: "",
		});
		expect(repository.listJobs()).toEqual([second, first]);
	});

	it("updates crawl success and failure state", () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		repository.markCrawling("job-1", 1100);
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "crawling",
			updatedAt: 1100,
		});

		repository.markReady("job-1", {
			cleanedText: "Build useful software.",
			now: 1200,
		});
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawlError: null,
			cleanedText: "Build useful software.",
			updatedAt: 1200,
			crawledAt: 1200,
		});

		repository.markFailed("job-1", {
			error: "Blocked",
			now: 1300,
		});
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError: "Blocked",
			updatedAt: 1300,
		});
	});

	it("resets failed jobs for retry and deletes jobs", () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		repository.markFailed("job-1", { error: "Timeout", now: 1100 });

		const retried = repository.resetForRetry("job-1", 1200);

		expect(retried).toMatchObject({
			crawlStatus: "pending",
			crawlError: null,
			updatedAt: 1200,
		});
		expect(repository.deleteJob("job-1")).toBe(true);
		expect(repository.getJob("job-1")).toBeNull();
		expect(repository.deleteJob("job-1")).toBe(false);
	});
});
