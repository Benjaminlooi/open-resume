import { randomUUID } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCrawlQueue } from "./job-postings/crawl-queue.js";
import type { JobRepository } from "./job-postings/repository.js";
import { createJobRepository } from "./job-postings/repository.js";
import { createServer } from "./server.js";

function parseJsonLogs(output: string) {
	return output
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

describe("companion server", () => {
	const servers: FastifyInstance[] = [];
	const repositories: JobRepository[] = [];
	const tempFiles: string[] = [];

	beforeEach(() => {
		vi.stubEnv("OPENAI_API_KEY", "sk-test-openai");
	});

	afterEach(async () => {
		for (const server of servers) {
			await server.close();
		}
		for (const repository of repositories) {
			repository.close();
		}
		for (const file of tempFiles) {
			try {
				rmSync(file, { force: true, recursive: true });
			} catch (_) {}
		}
		tempFiles.length = 0;
		servers.length = 0;
		repositories.length = 0;
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	function createTestServer(
		options: Omit<
			NonNullable<Parameters<typeof createServer>[0]>,
			"crawlQueue" | "jobRepository"
		> = {},
		beforeCreate?: (context: {
			crawlQueue: ReturnType<typeof createCrawlQueue>;
			repository: JobRepository;
		}) => void,
	) {
		const repository = createJobRepository(":memory:");
		const crawlQueue = createCrawlQueue({
			repository,
			crawl: async () => ({
				sourceUrl: "https://example.com/job",
				cleanedText: "Build useful software.",
				extractedAt: 1200,
			}),
			now: () => 1000,
			aiConfig: {
				provider: "openai",
				apiKey: "sk-test-openai",
				modelName: "gpt-4o-mini",
			},
		});
		beforeCreate?.({ crawlQueue, repository });

		const testDbDir = resolve(
			process.cwd(),
			`.open-resume-companion/test-db-${randomUUID()}`,
		);
		const profilePath = resolve(
			process.cwd(),
			`.open-resume-companion/profile-${randomUUID()}.json`,
		);
		const resumePath = resolve(
			process.cwd(),
			`.open-resume-companion/resume-${randomUUID()}.json`,
		);
		tempFiles.push(testDbDir, profilePath, resumePath);

		const server = createServer({
			databasePath: resolve(testDbDir, "jobs.sqlite"),
			profilePath,
			resumePath,
			...options,
			jobRepository: repository,
			crawlQueue,
		});
		servers.push(server);
		repositories.push(repository);
		return { crawlQueue, repository, server, testDbDir };
	}

	it("responds to health checks", async () => {
		const { server } = createTestServer();
		const response = await server.inject({
			method: "GET",
			url: "/health",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			ok: true,
			service: "open-resume-companion",
		});
	});

	it("rejects invalid job creation requests", async () => {
		const { server } = createTestServer();
		const response = await server.inject({
			method: "POST",
			url: "/job-postings",
			payload: { sourceUrl: "file:///etc/passwd" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			error: "Invalid companion request",
		});
	});

	it("rejects completely invalid URLs with 400 bad request", async () => {
		const { server } = createTestServer();
		const response = await server.inject({
			method: "POST",
			url: "/job-postings",
			payload: { sourceUrl: "string" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			error: "Invalid companion request",
		});
	});

	it("rejects malformed JSON job requests without serialization errors", async () => {
		const { server } = createTestServer();
		const response = await server.inject({
			method: "POST",
			url: "/job-postings",
			headers: {
				"content-type": "application/json",
			},
			payload: '{ "sourceUrl":',
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			error: expect.any(String),
		});
		expect(response.body).not.toContain("FST_ERR_FAILED_ERROR_SERIALIZATION");
	});

	it("logs request details when logging is enabled", async () => {
		let logOutput = "";
		const { server } = createTestServer({
			logLevel: "debug",
			logStream: {
				write(message: string) {
					logOutput += message;
				},
			},
		});

		const response = await server.inject({
			method: "GET",
			url: "/health",
		});

		expect(response.statusCode).toBe(200);
		const logs = parseJsonLogs(logOutput);
		expect(logs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					level: 30,
					msg: "incoming request",
				}),
				expect.objectContaining({
					level: 30,
					msg: "request completed",
				}),
			]),
		);
	});

	it("creates companion jobs immediately without waiting for crawl completion", async () => {
		const { crawlQueue, server } = createTestServer();
		vi.spyOn(crawlQueue, "enqueue");

		const response = await server.inject({
			method: "POST",
			url: "/job-postings",
			payload: { sourceUrl: "https://example.com/job" },
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			sourceUrl: "https://example.com/job",
			crawlStatus: "pending",
			cleanedText: "",
		});
		expect(crawlQueue.enqueue).toHaveBeenCalledWith(response.json().id);
	});

	it("lists, retries, gets, and deletes companion jobs", async () => {
		const { crawlQueue, repository, server } = createTestServer();
		vi.spyOn(crawlQueue, "enqueue");
		const created = repository.createJobPosting({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		repository.markFailed(created.id, { error: "Timeout", now: 1100 });

		expect(
			(await server.inject({ method: "GET", url: "/job-postings" })).json(),
		).toMatchObject({ jobPostings: [expect.objectContaining({ id: "job-1" })] });

		expect(
			(
				await server.inject({ method: "POST", url: "/job-postings/job-1/retry-crawl" })
			).json(),
		).toMatchObject({ id: "job-1", crawlStatus: "pending" });
		expect(crawlQueue.enqueue).toHaveBeenCalledWith("job-1");

		expect(
			(await server.inject({ method: "GET", url: "/job-postings/job-1" })).json(),
		).toMatchObject({ id: "job-1" });

		const deleteResponse = await server.inject({
			method: "DELETE",
			url: "/job-postings/job-1",
		});
		expect(deleteResponse.statusCode).toBe(200);
		expect(deleteResponse.json()).toEqual({ deleted: true });
	});

	it("returns not found responses for missing companion jobs", async () => {
		const { crawlQueue, server } = createTestServer();
		vi.spyOn(crawlQueue, "enqueue");

		const getResponse = await server.inject({
			method: "GET",
			url: "/job-postings/missing-job",
		});
		expect(getResponse.statusCode).toBe(404);
		expect(getResponse.json()).toEqual({ error: "Job posting not found" });

		const retryResponse = await server.inject({
			method: "POST",
			url: "/job-postings/missing-job/retry-crawl",
		});
		expect(retryResponse.statusCode).toBe(404);
		expect(retryResponse.json()).toEqual({ error: "Job posting not found" });
		expect(crawlQueue.enqueue).not.toHaveBeenCalled();

		const deleteResponse = await server.inject({
			method: "DELETE",
			url: "/job-postings/missing-job",
		});
		expect(deleteResponse.statusCode).toBe(200);
		expect(deleteResponse.json()).toEqual({ deleted: false });
	});

	it("GET /job-postings/:id/screenshot returns 404 if screenshot does not exist", async () => {
		const { server, repository } = createTestServer();

		// Case 1: Job does not exist
		const response1 = await server.inject({
			method: "GET",
			url: "/job-postings/non-existent-id/screenshot",
		});
		expect(response1.statusCode).toBe(404);
		expect(response1.json()).toEqual({ error: "Job posting not found" });

		// Case 2: Job exists but screenshot file does not
		repository.createJobPosting({
			id: "job-without-screenshot",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		const response2 = await server.inject({
			method: "GET",
			url: "/job-postings/job-without-screenshot/screenshot",
		});
		expect(response2.statusCode).toBe(404);
		expect(response2.json()).toEqual({ error: "Screenshot not found" });
	});

	it("GET /job-postings/:id/screenshot returns 200 and image/png stream if screenshot exists, and DELETE /job-postings/:id deletes the screenshot file", async () => {
		const { server, repository, testDbDir } = createTestServer();
		const jobId = "job-with-screenshot";
		repository.createJobPosting({
			id: jobId,
			sourceUrl: "https://example.com/job",
			now: 1000,
		});

		const screenshotsDir = resolve(testDbDir, "screenshots");
		const screenshotPath = resolve(screenshotsDir, `${jobId}.png`);
		writeFileSync(screenshotPath, "fake-png-data");

		// 1. Fetch screenshot
		const response = await server.inject({
			method: "GET",
			url: `/job-postings/${jobId}/screenshot`,
		});
		expect(response.statusCode).toBe(200);
		expect(response.headers["content-type"]).toBe("image/png");
		expect(response.body).toBe("fake-png-data");

		// 2. Delete job and verify screenshot is deleted
		const deleteResponse = await server.inject({
			method: "DELETE",
			url: `/job-postings/${jobId}`,
		});
		expect(deleteResponse.statusCode).toBe(200);
		expect(deleteResponse.json()).toEqual({ deleted: true });

		// Verify file does not exist anymore
		expect(existsSync(screenshotPath)).toBe(false);
	});

	it("retries job analysis and returns 404 for missing jobs", async () => {
		const { crawlQueue, repository, server } = createTestServer();
		vi.spyOn(crawlQueue, "enqueue");

		// 1. If the job doesn't exist, it returns 404.
		const missingResponse = await server.inject({
			method: "POST",
			url: "/job-postings/missing-job/retry-analyze",
		});
		expect(missingResponse.statusCode).toBe(404);
		expect(missingResponse.json()).toEqual({ error: "Job posting not found" });
		expect(crawlQueue.enqueue).not.toHaveBeenCalled();

		// 2. If the job exists, it resets the job status to analyzing, retains the cleaned_text and enqueues the job.
		const created = repository.createJobPosting({
			id: "job-analyze-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		repository.markAnalyzing(created.id, "Cleaned job text", 1100);
		repository.markReady(created.id, {
			cleanedText: "Cleaned job text",
			parsedTitle: "Software Engineer",
			now: 1200,
		});

		const retryResponse = await server.inject({
			method: "POST",
			url: `/job-postings/${created.id}/retry-analyze`,
		});
		expect(retryResponse.statusCode).toBe(200);
		expect(retryResponse.json()).toMatchObject({
			id: created.id,
			crawlStatus: "analyzing",
			cleanedText: "Cleaned job text",
		});
		expect(crawlQueue.enqueue).toHaveBeenCalledWith(created.id);
	});

	it("serves resume CRUD routes from SQLite", async () => {
		const { server } = createTestServer();

		const createResponse = await server.inject({
			method: "POST",
			url: "/resumes",
			payload: {
				id: "resume-1",
				name: "Backend Resume",
				templateId: "modern",
				content: { personalInfo: { fullName: "Jane Doe" } },
			},
		});
		expect(createResponse.statusCode).toBe(201);
		expect(createResponse.json()).toMatchObject({
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			isDefault: false,
			content: { personalInfo: { fullName: "Jane Doe" } },
		});

		expect(
			(await server.inject({ method: "GET", url: "/resumes" })).json(),
		).toEqual({
			resumes: [
				expect.objectContaining({
					id: "resume-1",
					name: "Backend Resume",
					templateId: "modern",
					isDefault: false,
				}),
			],
		});

		expect(
			(await server.inject({ method: "GET", url: "/resumes/resume-1" })).json(),
		).toMatchObject({
			id: "resume-1",
			content: { personalInfo: { fullName: "Jane Doe" } },
		});

		const updateResponse = await server.inject({
			method: "PUT",
			url: "/resumes/resume-1",
			payload: { name: "Updated Resume", content: { summary: "Updated" } },
		});
		expect(updateResponse.statusCode).toBe(200);
		expect(updateResponse.json()).toMatchObject({
			id: "resume-1",
			name: "Updated Resume",
			content: { summary: "Updated" },
		});

		const defaultResponse = await server.inject({
			method: "PUT",
			url: "/resumes/resume-1/default",
		});
		expect(defaultResponse.statusCode).toBe(200);
		expect(defaultResponse.json()).toMatchObject({
			id: "resume-1",
			isDefault: true,
		});

		const deleteDefaultResponse = await server.inject({
			method: "DELETE",
			url: "/resumes/default",
		});
		expect(deleteDefaultResponse.statusCode).toBe(200);
		expect(deleteDefaultResponse.json()).toEqual({ ok: true });

		const deleteResponse = await server.inject({
			method: "DELETE",
			url: "/resumes/resume-1",
		});
		expect(deleteResponse.statusCode).toBe(200);
		expect(deleteResponse.json()).toEqual({ deleted: true });
	});

	it("returns not found responses for missing resumes", async () => {
		const { server } = createTestServer();

		const getResponse = await server.inject({
			method: "GET",
			url: "/resumes/missing-resume",
		});
		expect(getResponse.statusCode).toBe(404);
		expect(getResponse.json()).toEqual({ error: "Resume not found" });

		const updateResponse = await server.inject({
			method: "PUT",
			url: "/resumes/missing-resume",
			payload: { name: "Missing Resume" },
		});
		expect(updateResponse.statusCode).toBe(404);
		expect(updateResponse.json()).toEqual({ error: "Resume not found" });

		const defaultResponse = await server.inject({
			method: "PUT",
			url: "/resumes/missing-resume/default",
		});
		expect(defaultResponse.statusCode).toBe(404);
		expect(defaultResponse.json()).toEqual({ error: "Resume not found" });
	});

	it("reads and writes profile resume through SQLite", async () => {
		const { server } = createTestServer();

		const missingResponse = await server.inject({
			method: "GET",
			url: "/profile/resume",
		});
		expect(missingResponse.statusCode).toBe(404);

		const syncResponse = await server.inject({
			method: "PUT",
			url: "/profile/resume",
			payload: { resume: { personalInfo: { fullName: "Jane Doe" } } },
		});
		expect(syncResponse.statusCode).toBe(200);
		expect(syncResponse.json()).toEqual({ ok: true });

		const getResponse = await server.inject({
			method: "GET",
			url: "/profile/resume",
		});
		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.json()).toEqual({
			personalInfo: { fullName: "Jane Doe" },
		});
	});

	it("does not recover runnable jobs unless explicitly enabled", () => {
		let recovered = false;

		createTestServer({}, ({ crawlQueue }) => {
			crawlQueue.enqueueRunnableJobs = vi.fn(() => {
				recovered = true;
			});
		});

		expect(recovered).toBe(false);
	});

	it("recovers runnable jobs when startup recovery is enabled", () => {
		let recovered = false;

		createTestServer({ recoverJobsOnStartup: true }, ({ crawlQueue }) => {
			crawlQueue.enqueueRunnableJobs = vi.fn(() => {
				recovered = true;
			});
		});

		expect(recovered).toBe(true);
	});

	it("serves candidate profile GET and PUT requests", async () => {
		const { server } = createTestServer();

		// 1. Initial GET should return default profile
		const getRes1 = await server.inject({
			method: "GET",
			url: "/profile",
		});
		expect(getRes1.statusCode).toBe(200);
		expect(getRes1.json().candidate.fullName).toBe("Benjamin Looi");

		// 2. PUT to update profile
		const newProfile = {
			...getRes1.json(),
			candidate: {
				...getRes1.json().candidate,
				fullName: "John Doe",
			},
		};
		const putRes = await server.inject({
			method: "PUT",
			url: "/profile",
			payload: newProfile,
		});
		expect(putRes.statusCode).toBe(200);
		expect(putRes.json().candidate.fullName).toBe("John Doe");

		// 3. GET should return updated profile
		const getRes2 = await server.inject({
			method: "GET",
			url: "/profile",
		});
		expect(getRes2.statusCode).toBe(200);
		expect(getRes2.json().candidate.fullName).toBe("John Doe");
	});

	it("handles resume sync GET and PUT requests", async () => {
		const { server } = createTestServer();

		// 1. Initial GET should return 404
		const getRes1 = await server.inject({
			method: "GET",
			url: "/profile/resume",
		});
		expect(getRes1.statusCode).toBe(404);

		// 2. PUT to sync resume
		const syncRes = await server.inject({
			method: "PUT",
			url: "/profile/resume",
			payload: {
				resume: {
					personalInfo: { fullName: "John Doe" },
					experience: [],
					education: [],
					skills: [],
				},
			},
		});
		expect(syncRes.statusCode).toBe(200);
		expect(syncRes.json()).toEqual({ ok: true });

		// 3. GET should return synced resume
		const getRes2 = await server.inject({
			method: "GET",
			url: "/profile/resume",
		});
		expect(getRes2.statusCode).toBe(200);
		expect(getRes2.json().personalInfo.fullName).toBe("John Doe");
	});

	it("serves an OpenAPI document with companion route contracts", async () => {
		const { server } = createTestServer();
		const response = await server.inject({
			method: "GET",
			url: "/openapi.json",
		});

		expect(response.statusCode).toBe(200);
		const document = response.json();
		expect(document.openapi).toBe("3.0.3");
		expect(document.info).toMatchObject({
			title: "Open Resume Companion API",
			version: "0.1.0",
		});
		expect(document.paths["/health"].get).toMatchObject({
			operationId: "getHealth",
			tags: ["System"],
		});
		expect(document.paths["/job-postings"].post).toMatchObject({
			operationId: "createJobPosting",
			tags: ["Job Postings"],
		});
		expect(document.paths["/job-postings"].get).toMatchObject({
			operationId: "listJobPostings",
			tags: ["Job Postings"],
		});
		expect(document.paths["/job-postings/{id}"].get).toMatchObject({
			operationId: "getJobPosting",
			tags: ["Job Postings"],
		});
		expect(document.paths["/job-postings/{id}/retry-crawl"].post).toMatchObject({
			operationId: "retryJobPostingCrawl",
			tags: ["Job Postings"],
		});
		expect(document.components.schemas).toMatchObject({
			JobPosting: expect.any(Object),
			JobPostingsResponse: expect.any(Object),
			CreateJobPostingRequest: expect.any(Object),
			CompanionErrorResponse: expect.any(Object),
			DeleteJobPostingResponse: expect.any(Object),
			HealthResponse: expect.any(Object),
		});
		expect(
			document.components.schemas.CreateJobPostingRequest.properties.sourceUrl,
		).toMatchObject({
			type: "string",
			format: "uri",
			description: "HTTP or HTTPS job posting URL to crawl.",
		});
		expect(document.paths["/openapi.json"]).toBeUndefined();
	});

	it("serves Swagger UI for manual API exploration", async () => {
		const { server } = createTestServer();
		const response = await server.inject({
			method: "GET",
			url: "/docs",
		});

		expect([200, 301, 302]).toContain(response.statusCode);
	});

	it("manages job applications CRUD operations", async () => {
		const { server } = createTestServer();

		// 1. GET /job-applications initially empty
		const getRes1 = await server.inject({
			method: "GET",
			url: "/job-applications",
		});
		expect(getRes1.statusCode).toBe(200);
		expect(getRes1.json()).toEqual({ jobApplications: [] });

		// 2. POST /job-applications creates one
		const postRes = await server.inject({
			method: "POST",
			url: "/job-applications",
			payload: {
				id: "app-123",
				company: "Acme Corp",
				title: "Frontend Engineer",
				location: "Remote",
				sourceUrl: "https://example.com/job-123",
				description: "Design beautiful web apps.",
			},
		});
		expect(postRes.statusCode).toBe(201);
		expect(postRes.json()).toMatchObject({
			id: "app-123",
			company: "Acme Corp",
			title: "Frontend Engineer",
			location: "Remote",
			sourceUrl: "https://example.com/job-123",
			description: "Design beautiful web apps.",
			status: "saved",
			notes: "",
			followUpAt: null,
		});

		// 3. GET /job-applications returns the created one
		const getRes2 = await server.inject({
			method: "GET",
			url: "/job-applications",
		});
		expect(getRes2.statusCode).toBe(200);
		expect(getRes2.json().jobApplications).toHaveLength(1);
		expect(getRes2.json().jobApplications[0].id).toBe("app-123");

		// 4. GET /job-applications/:id retrieves it
		const getByIdRes = await server.inject({
			method: "GET",
			url: "/job-applications/app-123",
		});
		expect(getByIdRes.statusCode).toBe(200);
		expect(getByIdRes.json().id).toBe("app-123");

		// 4b. GET /job-applications/:id with missing returns 404
		const getMissingRes = await server.inject({
			method: "GET",
			url: "/job-applications/missing-app",
		});
		expect(getMissingRes.statusCode).toBe(404);

		// 5. PUT /job-applications/:id updates it
		const putRes = await server.inject({
			method: "PUT",
			url: "/job-applications/app-123",
			payload: {
				title: "Senior Frontend Engineer",
				status: "applied",
				notes: "Applied via referral.",
			},
		});
		expect(putRes.statusCode).toBe(200);
		expect(putRes.json()).toMatchObject({
			id: "app-123",
			title: "Senior Frontend Engineer",
			status: "applied",
			notes: "Applied via referral.",
		});

		// 5b. PUT /job-applications/:id with missing returns 404
		const putMissingRes = await server.inject({
			method: "PUT",
			url: "/job-applications/missing-app",
			payload: {
				title: "No-op",
			},
		});
		expect(putMissingRes.statusCode).toBe(404);

		// 6. DELETE /job-applications/:id deletes it
		const deleteRes = await server.inject({
			method: "DELETE",
			url: "/job-applications/app-123",
		});
		expect(deleteRes.statusCode).toBe(200);
		expect(deleteRes.json()).toEqual({ deleted: true });

		// 6b. GET /job-applications/:id returns 404
		const getDeletedRes = await server.inject({
			method: "GET",
			url: "/job-applications/app-123",
		});
		expect(getDeletedRes.statusCode).toBe(404);
	});

	it("converts a companion job to a job application", async () => {
		const { server, repository } = createTestServer();

		// Create a job first
		repository.createJobPosting({
			id: "job-convert-test",
			sourceUrl: "https://example.com/convert-test",
			now: 1000,
		});

		// Mark it ready with some parsed fields
		repository.markReady("job-convert-test", {
			cleanedText: "Job text here",
			parsedTitle: "Developer",
			parsedCompany: "Test Inc",
			parsedLocation: "San Francisco",
			parsedDescription: "Develop stuff",
			fitScore: 85,
			fitBriefJson: JSON.stringify({
				roleSummary: "Good fit",
				requirements: ["Experience"],
				keywords: ["typescript"],
				strengths: ["Clean code"],
				gaps: [],
				risks: [],
				nextActions: [],
				generatedAt: 1200,
			}),
			now: 1100,
		});

		// Convert it via POST /jobs/:id/convert
		const convertRes = await server.inject({
			method: "POST",
			url: "/job-postings/job-convert-test/convert",
		});

		expect(convertRes.statusCode).toBe(200);
		expect(convertRes.json()).toMatchObject({
			id: "job-convert-test",
			company: "Test Inc",
			title: "Developer",
			location: "San Francisco",
			sourceUrl: "https://example.com/convert-test",
			description: "Develop stuff",
			status: "saved",
			fitBrief: {
				roleSummary: "Good fit",
				requirements: ["Experience"],
				keywords: ["typescript"],
				strengths: ["Clean code"],
				gaps: [],
				risks: [],
				nextActions: [],
				generatedAt: 1200,
			},
		});

		// Verify that the job is deleted
		const getJobRes = await server.inject({
			method: "GET",
			url: "/job-postings/job-convert-test",
		});
		expect(getJobRes.statusCode).toBe(404);

		// Verify that the job application exists
		const getAppRes = await server.inject({
			method: "GET",
			url: "/job-applications/job-convert-test",
		});
		expect(getAppRes.statusCode).toBe(200);
		expect(getAppRes.json().id).toBe("job-convert-test");

		// Test 404 on converting non-existent job
		const convertMissingRes = await server.inject({
			method: "POST",
			url: "/job-postings/missing-job/convert",
		});
		expect(convertMissingRes.statusCode).toBe(404);
	});
});
