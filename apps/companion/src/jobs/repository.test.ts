import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
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
			parsedTitle: null,
			parsedCompany: null,
			parsedLocation: null,
			parsedDescription: null,
			fitScore: null,
			fitBriefJson: null,
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

	it("transitions status to analyzing correctly", () => {
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

		repository.markAnalyzing("job-1", 1150);
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "analyzing",
			updatedAt: 1150,
		});
	});

	it("saves parsed details, fit score, and fit brief json on markReady", () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		repository.markReady("job-1", {
			cleanedText: "Build useful software.",
			parsedTitle: "Software Engineer",
			parsedCompany: "Acme Corp",
			parsedLocation: "Remote",
			parsedDescription: "Develop great features.",
			fitScore: 85,
			fitBriefJson: '{"reason":"good fit"}',
			now: 1200,
		});

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawlError: null,
			cleanedText: "Build useful software.",
			parsedTitle: "Software Engineer",
			parsedCompany: "Acme Corp",
			parsedLocation: "Remote",
			parsedDescription: "Develop great features.",
			fitScore: 85,
			fitBriefJson: '{"reason":"good fit"}',
			updatedAt: 1200,
			crawledAt: 1200,
		});
	});

	it("migrates existing database schema automatically on startup", () => {
		const path = createTempDatabasePath();

		// Initialize DB with the old schema manually
		const db = new DatabaseSync(path);
		db.exec(`
			create table jobs (
				id text primary key,
				source_url text not null,
				crawl_status text not null check (
					crawl_status in ('pending', 'crawling', 'ready', 'failed')
				),
				crawl_error text,
				cleaned_text text not null default '',
				created_at integer not null,
				updated_at integer not null,
				crawled_at integer
			);
			insert into jobs (
				id, source_url, crawl_status, crawl_error, cleaned_text,
				created_at, updated_at, crawled_at
			) values ('old-job', 'https://example.com/old', 'ready', null, 'Cleaned text', 1000, 1100, 1100);
		`);
		db.close();

		// Open it with createJobRepository and make sure it migrates and preserves data
		const repository = createJobRepository(path);
		repositories.push(repository);

		const migratedJob = repository.getJob("old-job");
		expect(migratedJob).toMatchObject({
			id: "old-job",
			sourceUrl: "https://example.com/old",
			crawlStatus: "ready",
			cleanedText: "Cleaned text",
			createdAt: 1000,
			updatedAt: 1100,
			crawledAt: 1100,
			parsedTitle: null,
			parsedCompany: null,
			parsedLocation: null,
			parsedDescription: null,
			fitScore: null,
			fitBriefJson: null,
		});

		// Make sure we can write new fields to it
		repository.markReady("old-job", {
			cleanedText: "Cleaned text",
			parsedTitle: "Senior dev",
			fitScore: 90,
			now: 1200,
		});

		expect(repository.getJob("old-job")).toMatchObject({
			parsedTitle: "Senior dev",
			fitScore: 90,
			updatedAt: 1200,
		});
	});
});
