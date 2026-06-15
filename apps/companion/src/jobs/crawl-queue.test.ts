import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeJobPosting } from "./ai-analyzer.js";
import { createCrawlQueue } from "./crawl-queue.js";
import { createJobRepository } from "./repository.js";

vi.mock("./ai-analyzer.js", () => ({
	analyzeJobPosting: vi.fn(),
}));

describe("crawl queue", () => {
	const repositories: Array<ReturnType<typeof createJobRepository>> = [];

	beforeEach(() => {
		vi.mocked(analyzeJobPosting).mockResolvedValue({
			title: "Mocked Staff Engineer",
			company: "Mocked Acme Corp",
			location: "Remote",
			description: "Mocked job description",
			fitScore: 92,
			fitBrief: {
				roleSummary: "Mocked summary",
				requirements: ["React", "TypeScript"],
				keywords: ["frontend", "staff"],
				strengths: ["Highly aligned experience"],
				gaps: ["No direct management mentioned"],
				risks: ["Fast-paced environment"],
				nextActions: ["Apply through website"],
				generatedAt: 1200,
			},
		});
	});

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

	function createDefaultResume(
		repository: ReturnType<typeof createJobRepository>,
	) {
		repository.createResume({
			id: "resume-1",
			name: "Default Resume",
			templateId: "modern",
			content: { personalInfo: { fullName: "Jane Doe" } },
			now: 1000,
		});
		repository.setDefaultResume("resume-1", 1000);
	}

	it("marks a job ready when crawling succeeds", async () => {
		const repository = createTestRepository();
		createDefaultResume(repository);
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
		createDefaultResume(repository);
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
		createDefaultResume(repository);
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
		createDefaultResume(repository);
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
		const crawl = vi.fn(async (sourceUrl: string, _jobId: string) => ({
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

		expect(crawl).toHaveBeenCalledWith(
			"https://example.com/pending",
			"pending-job",
		);
		expect(crawl).toHaveBeenCalledWith(
			"https://example.com/crawling",
			"crawling-job",
		);
		expect(crawl).not.toHaveBeenCalledWith(
			"https://example.com/ready",
			expect.any(String),
		);
		expect(crawl).not.toHaveBeenCalledWith(
			"https://example.com/failed",
			expect.any(String),
		);
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

	it("transitions status to analyzing and updates to ready with all AI details on success", async () => {
		const repository = createTestRepository();
		createDefaultResume(repository);
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		const customAnalyze = vi.fn().mockResolvedValue({
			title: "AI Engineer",
			company: "OpenAI",
			location: "San Francisco",
			description: "Work on AI",
			fitScore: 95,
			fitBrief: {
				roleSummary: "Excellent candidate fit",
				requirements: ["Python"],
				keywords: ["ai"],
				strengths: ["coding"],
				gaps: ["none"],
				risks: ["none"],
				nextActions: ["apply"],
				generatedAt: 1200,
			},
		});

		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Cleaned job text",
				extractedAt: 1200,
			}),
			analyze: customAnalyze,
			profilePath: "/path/to/profile.json",
			resumePath: "/path/to/resume.json",
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(customAnalyze).toHaveBeenCalledWith({
			profilePath: "/path/to/profile.json",
			resumeContent: JSON.stringify({
				personalInfo: { fullName: "Jane Doe" },
			}),
			cleanedText: "Cleaned job text",
		});

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawlError: null,
			cleanedText: "Cleaned job text",
			parsedTitle: "AI Engineer",
			parsedCompany: "OpenAI",
			parsedLocation: "San Francisco",
			parsedDescription: "Work on AI",
			fitScore: 95,
			fitBriefJson: JSON.stringify({
				roleSummary: "Excellent candidate fit",
				requirements: ["Python"],
				keywords: ["ai"],
				strengths: ["coding"],
				gaps: ["none"],
				risks: ["none"],
				nextActions: ["apply"],
				generatedAt: 1200,
			}),
		});
	});

	it("passes the SQLite default resume content to the analyzer", async () => {
		const repository = createTestRepository();
		createDefaultResume(repository);
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const customAnalyze = vi.fn().mockResolvedValue({
			title: "AI Engineer",
			company: "OpenAI",
			location: "Remote",
			description: "Work on AI",
			fitScore: 95,
			fitBrief: {
				roleSummary: "Strong fit",
				requirements: ["TypeScript"],
				keywords: ["frontend"],
				strengths: ["shipping"],
				gaps: [],
				risks: [],
				nextActions: ["apply"],
				generatedAt: 1200,
			},
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Cleaned job text",
				extractedAt: 1200,
			}),
			analyze: customAnalyze,
			profilePath: "/path/to/profile.json",
			resumePath: "/missing/resume.json",
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(customAnalyze).toHaveBeenCalledWith({
			profilePath: "/path/to/profile.json",
			resumeContent: JSON.stringify({
				personalInfo: { fullName: "Jane Doe" },
			}),
			cleanedText: "Cleaned job text",
		});
	});

	it("falls back to resumePath when no SQLite default resume exists", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const customAnalyze = vi.fn().mockResolvedValue({
			title: "AI Engineer",
			company: "OpenAI",
			location: "Remote",
			description: "Work on AI",
			fitScore: 95,
			fitBrief: {
				roleSummary: "Strong fit",
				requirements: ["TypeScript"],
				keywords: ["frontend"],
				strengths: ["shipping"],
				gaps: [],
				risks: [],
				nextActions: ["apply"],
				generatedAt: 1200,
			},
		});
		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Cleaned job text",
				extractedAt: 1200,
			}),
			analyze: customAnalyze,
			profilePath: "/path/to/profile.json",
			resumePath: "/path/to/resume.json",
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(customAnalyze).toHaveBeenCalledWith({
			profilePath: "/path/to/profile.json",
			resumePath: "/path/to/resume.json",
			cleanedText: "Cleaned job text",
		});
	});

	it("fails analysis with a useful error when no default resume is synced", async () => {
		const repository = createTestRepository();
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const customAnalyze = vi.fn();
		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Cleaned job text",
				extractedAt: 1200,
			}),
			analyze: customAnalyze,
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(customAnalyze).not.toHaveBeenCalled();
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError:
				"Synced default resume not found. Please sync your resume in the settings panel.",
		});
	});

	it("transitions status to failed if AI analysis fails", async () => {
		const repository = createTestRepository();
		createDefaultResume(repository);
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		const failingAnalyze = vi
			.fn()
			.mockRejectedValue(new Error("AI Key Mismatch"));

		const queue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Cleaned job text",
				extractedAt: 1200,
			}),
			analyze: failingAnalyze,
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "failed",
			crawlError: "AI Key Mismatch",
		});
	});

	it("bypasses crawl and executes AI analysis when cleanedText is already populated", async () => {
		const repository = createTestRepository();
		createDefaultResume(repository);
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com",
			now: 1000,
		});
		// Pre-fill cleanedText
		repository.markAnalyzing("job-1", "Pre-scraped job text", 1100);

		const crawlSpy = vi.fn();
		const customAnalyze = vi.fn().mockResolvedValue({
			title: "Pre-scraped AI Engineer",
			company: "Pre OpenAI",
			location: "SF",
			description: "Details",
			fitScore: 99,
			fitBrief: {
				roleSummary: "Good fit",
				requirements: [],
				keywords: [],
				strengths: [],
				gaps: [],
				risks: [],
				nextActions: [],
				generatedAt: 1200,
			},
		});

		const queue = createCrawlQueue({
			repository,
			crawl: crawlSpy,
			analyze: customAnalyze,
			profilePath: "/path/to/profile.json",
			resumePath: "/path/to/resume.json",
			now: () => 1200,
		});

		await queue.runJob("job-1");

		expect(crawlSpy).not.toHaveBeenCalled();
		expect(customAnalyze).toHaveBeenCalledWith({
			profilePath: "/path/to/profile.json",
			resumeContent: JSON.stringify({ personalInfo: { fullName: "Jane Doe" } }),
			cleanedText: "Pre-scraped job text",
		});
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			cleanedText: "Pre-scraped job text",
			parsedTitle: "Pre-scraped AI Engineer",
		});
	});

	it("preserves crawl timestamp if already present when bypassing crawl", async () => {
		const repository = createTestRepository();
		createDefaultResume(repository);
		repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com",
			now: 1000,
		});

		const queue1 = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com",
				cleanedText: "First scraped text",
				extractedAt: 1050,
			}),
			now: () => 1050,
		});
		await queue1.runJob("job-1");

		expect(repository.getJob("job-1")?.crawledAt).toBe(1050);

		repository.markAnalyzing("job-1", "First scraped text", 1100);

		const crawlSpy = vi.fn();
		const customAnalyze = vi.fn().mockResolvedValue({
			title: "Pre-scraped AI Engineer",
			company: "Pre OpenAI",
			location: "SF",
			description: "Details",
			fitScore: 99,
			fitBrief: {
				roleSummary: "Good fit",
				requirements: [],
				keywords: [],
				strengths: [],
				gaps: [],
				risks: [],
				nextActions: [],
				generatedAt: 1200,
			},
		});

		const queue2 = createCrawlQueue({
			repository,
			crawl: crawlSpy,
			analyze: customAnalyze,
			profilePath: "/path/to/profile.json",
			resumePath: "/path/to/resume.json",
			now: () => 1200,
		});

		await queue2.runJob("job-1");

		expect(crawlSpy).not.toHaveBeenCalled();
		expect(repository.getJob("job-1")).toMatchObject({
			crawlStatus: "ready",
			crawledAt: 1050,
		});
	});

	it("enqueues and processes analyzing jobs in enqueueRunnableJobs", async () => {
		const repository = createTestRepository();
		createDefaultResume(repository);

		repository.createJob({
			id: "analyzing-job",
			sourceUrl: "https://example.com/analyzing",
			now: 1000,
		});
		repository.markAnalyzing(
			"analyzing-job",
			"Pre-scraped text for analyzing",
			1100,
		);

		const crawlSpy = vi.fn();
		const customAnalyze = vi.fn().mockResolvedValue({
			title: "AI Engineer",
			company: "OpenAI",
			location: "SF",
			description: "Details",
			fitScore: 99,
			fitBrief: {
				roleSummary: "Good fit",
				requirements: [],
				keywords: [],
				strengths: [],
				gaps: [],
				risks: [],
				nextActions: [],
				generatedAt: 1200,
			},
		});

		const queue = createCrawlQueue({
			repository,
			crawl: crawlSpy,
			analyze: customAnalyze,
			profilePath: "/path/to/profile.json",
			resumePath: "/path/to/resume.json",
			now: () => 1200,
		});

		queue.enqueueRunnableJobs();

		await vi.waitFor(() => expect(customAnalyze).toHaveBeenCalledTimes(1));

		expect(crawlSpy).not.toHaveBeenCalled();
		expect(repository.getJob("analyzing-job")?.crawlStatus).toBe("ready");
	});
});
