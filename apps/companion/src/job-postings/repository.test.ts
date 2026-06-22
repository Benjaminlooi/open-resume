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

		const first = repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			now: 1000,
		});
		const second = repository.createJobPosting({
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
		expect(repository.listJobPostings()).toEqual([second, first]);
	});

	it("lists jobs by update time", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			now: 1000,
		});
		repository.createJobPosting({
			id: "job-2",
			sourceUrl: "https://example.com/two",
			now: 2000,
		});

		repository.markFailed("job-1", { error: "Blocked", now: 3000 });

		expect(repository.listJobPostings()[0]?.id).toBe("job-1");
	});

	it("persists jobs in a file-backed database", () => {
		const path = createTempDatabasePath();
		const firstRepository = createJobRepository(path);
		repositories.push(firstRepository);
		firstRepository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		firstRepository.close();
		repositories.pop();

		const secondRepository = createJobRepository(path);
		repositories.push(secondRepository);

		expect(secondRepository.getJobPosting("job-1")).toMatchObject({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			crawlStatus: "pending",
			createdAt: 1000,
			updatedAt: 1000,
		});
	});

	it("creates, lists, updates, and deletes resumes", () => {
		const repository = createTestRepository();

		const created = repository.createResume({
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			content: { personalInfo: { fullName: "Jane Doe" } },
			now: 1000,
		});

		expect(created).toMatchObject({
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			lastModified: 1000,
			isDefault: false,
			content: { personalInfo: { fullName: "Jane Doe" } },
		});
		expect(repository.listResumes()).toEqual([
			{
				id: "resume-1",
				name: "Backend Resume",
				templateId: "modern",
				lastModified: 1000,
				isDefault: false,
			},
		]);

		expect(
			repository.updateResume("resume-1", {
				name: "Renamed Resume",
				templateId: "demo",
				content: { summary: "Updated" },
				now: 1100,
			}),
		).toMatchObject({
			name: "Renamed Resume",
			templateId: "demo",
			lastModified: 1100,
			content: { summary: "Updated" },
		});

		expect(repository.deleteResume("resume-1")).toBe(true);
		expect(repository.getResume("resume-1")).toBeNull();
	});

	it("allows at most one default resume and can clear it", () => {
		const repository = createTestRepository();
		repository.createResume({
			id: "resume-1",
			name: "One",
			templateId: "demo",
			content: { summary: "One" },
			now: 1000,
		});
		repository.createResume({
			id: "resume-2",
			name: "Two",
			templateId: "modern",
			content: { summary: "Two" },
			now: 1000,
		});

		expect(repository.setDefaultResume("resume-1", 1100)?.isDefault).toBe(true);
		expect(repository.setDefaultResume("resume-2", 1200)?.isDefault).toBe(true);
		expect(repository.getDefaultResume()?.id).toBe("resume-2");
		expect(repository.getResume("resume-1")?.isDefault).toBe(false);

		repository.clearDefaultResume(1300);
		expect(repository.getDefaultResume()).toBeNull();
	});

	it("lists runnable jobs ordered by creation time", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com/one",
			now: 1000,
		});
		repository.createJobPosting({
			id: "job-2",
			sourceUrl: "https://example.com/two",
			now: 2000,
		});
		repository.createJobPosting({
			id: "job-3",
			sourceUrl: "https://example.com/three",
			now: 3000,
		});
		repository.createJobPosting({
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

		expect(repository.listRunnableJobPostings().map((job) => job.id)).toEqual([
			"job-1",
			"job-2",
		]);
	});

	it("updates crawl success and failure state", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		repository.markCrawling("job-1", 1100);
		expect(repository.getJobPosting("job-1")).toMatchObject({
			crawlStatus: "crawling",
			updatedAt: 1100,
		});

		repository.markReady("job-1", {
			cleanedText: "Build useful software.",
			now: 1200,
		});
		expect(repository.getJobPosting("job-1")).toMatchObject({
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
		expect(repository.getJobPosting("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError: "Blocked",
			updatedAt: 1300,
		});
	});

	it("resets failed jobs for retry and deletes jobs", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
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
		expect(repository.deleteJobPosting("job-1")).toBe(true);
		expect(repository.getJobPosting("job-1")).toBeNull();
		expect(repository.deleteJobPosting("job-1")).toBe(false);
	});

	it("transitions status to analyzing correctly", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		repository.markCrawling("job-1", 1100);
		expect(repository.getJobPosting("job-1")).toMatchObject({
			crawlStatus: "crawling",
			updatedAt: 1100,
		});

		repository.markAnalyzing("job-1", "", 1150);
		expect(repository.getJobPosting("job-1")).toMatchObject({
			crawlStatus: "analyzing",
			updatedAt: 1150,
		});
	});

	it("saves cleanedText in markAnalyzing", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com",
			now: 1000,
		});
		repository.markAnalyzing("job-1", "Sample cleaned text", 1100);
		expect(repository.getJobPosting("job-1")).toMatchObject({
			crawlStatus: "analyzing",
			cleanedText: "Sample cleaned text",
			updatedAt: 1100,
		});
	});

	it("clears cleanedText to empty string on resetForRetry", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com",
			now: 1000,
		});
		repository.markAnalyzing("job-1", "Sample cleaned text", 1100);
		repository.resetForRetry("job-1", 1200);
		expect(repository.getJobPosting("job-1")).toMatchObject({
			crawlStatus: "pending",
			cleanedText: "",
		});
	});

	it("resets status to analyzing and keeps cleanedText on resetForAnalysisRetry", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com",
			now: 1000,
		});
		repository.markAnalyzing("job-1", "Sample cleaned text", 1100);
		repository.markFailed("job-1", { error: "AI Failed", now: 1200 });
		repository.resetForAnalysisRetry("job-1", 1300);
		expect(repository.getJobPosting("job-1")).toMatchObject({
			crawlStatus: "analyzing",
			crawlError: null,
			cleanedText: "Sample cleaned text",
		});
	});

	it("includes analyzing jobs in listRunnableJobs", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com",
			now: 1000,
		});
		repository.markAnalyzing("job-1", "Sample", 1100);
		const runnable = repository.listRunnableJobPostings();
		expect(runnable.map((j) => j.id)).toContain("job-1");
	});

	it("saves parsed details, fit score, and fit brief json on markReady", () => {
		const repository = createTestRepository();
		repository.createJobPosting({
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

		expect(repository.getJobPosting("job-1")).toMatchObject({
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

		const migratedJob = repository.getJobPosting("old-job");
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

		expect(repository.getJobPosting("old-job")).toMatchObject({
			parsedTitle: "Senior dev",
			fitScore: 90,
			updatedAt: 1200,
		});
	});

	describe("job applications", () => {
		it("creates, lists, and gets job applications", () => {
			const repository = createTestRepository();
			const now = 1000;
			const created = repository.createJobApplication({
				id: "app-1",
				company: "Google",
				title: "SWE",
				location: "Mountain View, CA",
				sourceUrl: "https://google.com/jobs/1",
				description: "Write code.",
				now,
			});

			expect(created).toEqual({
				id: "app-1",
				company: "Google",
				title: "SWE",
				location: "Mountain View, CA",
				sourceUrl: "https://google.com/jobs/1",
				description: "Write code.",
				status: "saved",
				sourceResumeId: null,
				sourceResumeName: null,
				sourceResumeSnapshot: null,
				tailoredResume: null,
				fitBrief: null,
				resumeEditProposals: [],
				coverLetterDraft: null,
				notes: "",
				followUpAt: null,
				createdAt: now,
				updatedAt: now,
			});

			const fetched = repository.getJobApplication("app-1");
			expect(fetched).toEqual(created);

			// create second one
			const second = repository.createJobApplication({
				id: "app-2",
				company: "Apple",
				title: "iOS Dev",
				location: "Cupertino, CA",
				sourceUrl: "https://apple.com/jobs/2",
				description: "Swift UI code.",
				now: 2000,
			});

			const list = repository.listJobApplications();
			expect(list).toEqual([second, created]);
		});

		it("updates job applications including JSON columns", () => {
			const repository = createTestRepository();
			repository.createJobApplication({
				id: "app-1",
				company: "Google",
				title: "SWE",
				location: "Mountain View, CA",
				sourceUrl: "https://google.com/jobs/1",
				description: "Write code.",
				now: 1000,
			});

			const updated = repository.updateJobApplication("app-1", {
				company: "Alphabet",
				status: "interviewing",
				sourceResumeId: "resume-abc",
				sourceResumeSnapshot: { personalInfo: { fullName: "Bob" } },
				resumeEditProposals: [
					{
						id: "prop-1",
						target: { section: "summary" },
						currentText: "Old",
						suggestedText: "New",
						rationale: "Better",
						status: "pending",
						createdAt: 1200,
					},
				],
				notes: "First round scheduled",
				now: 1500,
			});

			expect(updated).toMatchObject({
				company: "Alphabet",
				status: "interviewing",
				sourceResumeId: "resume-abc",
				sourceResumeSnapshot: { personalInfo: { fullName: "Bob" } },
				resumeEditProposals: [
					{
						id: "prop-1",
						status: "pending",
					},
				],
				notes: "First round scheduled",
				updatedAt: 1500,
			});

			// Now check that we can set them to null/empty values
			const cleared = repository.updateJobApplication("app-1", {
				sourceResumeId: null,
				sourceResumeSnapshot: null,
				now: 1600,
			});
			expect(cleared?.sourceResumeId).toBeNull();
			expect(cleared?.sourceResumeSnapshot).toBeNull();
		});

		it("deletes job applications", () => {
			const repository = createTestRepository();
			repository.createJobApplication({
				id: "app-1",
				company: "Google",
				title: "SWE",
				location: "Mountain View, CA",
				sourceUrl: "https://google.com/jobs/1",
				description: "Write code.",
				now: 1000,
			});

			expect(repository.deleteJobApplication("app-1")).toBe(true);
			expect(repository.getJobApplication("app-1")).toBeNull();
			expect(repository.deleteJobApplication("app-1")).toBe(false);
		});

		it("converts job to job application", () => {
			const repository = createTestRepository();
			repository.createJobPosting({
				id: "job-123",
				sourceUrl: "https://netflix.com/careers/456",
				now: 1000,
			});

			repository.markReady("job-123", {
				cleanedText: "Clean text",
				parsedCompany: "Netflix",
				parsedTitle: "Senior Architect",
				parsedLocation: "Los Gatos, CA",
				parsedDescription: "Netflix description",
				fitBriefJson: '{"reason":"great candidate"}',
				now: 1100,
			});

			const converted = repository.convertJobToApplication("job-123", 1200);

			expect(converted).toEqual({
				id: "job-123",
				company: "Netflix",
				title: "Senior Architect",
				location: "Los Gatos, CA",
				sourceUrl: "https://netflix.com/careers/456",
				description: "Netflix description",
				status: "saved",
				sourceResumeId: null,
				sourceResumeName: null,
				sourceResumeSnapshot: null,
				tailoredResume: null,
				fitBrief: { reason: "great candidate" },
				resumeEditProposals: [],
				coverLetterDraft: null,
				notes: "",
				followUpAt: null,
				createdAt: 1200,
				updatedAt: 1200,
			});

			// Verify the job is deleted from jobs table
			expect(repository.getJobPosting("job-123")).toBeNull();
		});

		it("converts job to application using sourceUrl hostname fallback when company/title are missing", () => {
			const repository = createTestRepository();
			repository.createJobPosting({
				id: "job-abc",
				sourceUrl: "https://sub.domain.company.com/careers/info",
				now: 1000,
			});
			repository.markReady("job-abc", {
				cleanedText: "Clean text only",
				now: 1100,
			});

			const converted = repository.convertJobToApplication("job-abc", 1200);

			expect(converted).toMatchObject({
				id: "job-abc",
				company: "sub.domain.company.com",
				title: "Untitled Job",
				location: "",
				description: "Clean text only",
			});
		});
	});
});
