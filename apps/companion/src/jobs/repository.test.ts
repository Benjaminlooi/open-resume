import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createJobRepository } from "./repository.js";

describe("job repository", () => {
	const repositories: Array<ReturnType<typeof createJobRepository>> = [];
	const tempDirectories: string[] = [];

	afterEach(() => {
		for (const repository of repositories) {
			repository.close();
		}
		repositories.length = 0;

		for (const directory of tempDirectories) {
			rmSync(directory, { recursive: true, force: true });
		}
		tempDirectories.length = 0;
	});

	function createTestRepository() {
		const repository = createJobRepository(":memory:");
		repositories.push(repository);
		return repository;
	}

	function createTempDatabasePath() {
		const directory = mkdtempSync(join(tmpdir(), "job-repository-"));
		tempDirectories.push(directory);
		return join(directory, "jobs.sqlite");
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
			createdAt: 1000,
			updatedAt: 1000,
		});
		expect(repository.listJobs()).toEqual([second, first]);
	});

	it("lists jobs by update time", () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			now: 1000,
		});
		repository.createJob({
			id: "job-2",
			sourceUrl: "https://example.com/two",
			now: 2000,
		});

		repository.markFailed("job-1", { error: "Blocked", now: 3000 });

		expect(repository.listJobs()[0]?.id).toBe("job-1");
	});

	it("persists jobs in a file-backed database", () => {
		const path = createTempDatabasePath();
		const firstRepository = createJobRepository(path);
		repositories.push(firstRepository);
		firstRepository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		firstRepository.close();
		repositories.pop();

		const secondRepository = createJobRepository(path);
		repositories.push(secondRepository);

		expect(secondRepository.getJob("job-1")).toMatchObject({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			crawlStatus: "pending",
			createdAt: 1000,
			updatedAt: 1000,
		});
	});

	it("lists runnable jobs ordered by creation time", () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			now: 1000,
		});
		repository.createJob({
			id: "job-2",
			sourceUrl: "https://example.com/two",
			now: 2000,
		});
		repository.createJob({
			id: "job-3",
			sourceUrl: "https://example.com/three",
			now: 3000,
		});
		repository.createJob({
			id: "job-4",
			sourceUrl: "https://example.com/four",
			now: 4000,
		});

		repository.markCrawling("job-2", 5000);
		repository.markReady("job-3", {
			cleanedText: "Ready job",
			now: 6000,
		});
		repository.markFailed("job-4", { error: "Blocked", now: 7000 });

		expect(repository.listRunnableJobs().map((job) => job.id)).toEqual([
			"job-1",
			"job-2",
		]);
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
