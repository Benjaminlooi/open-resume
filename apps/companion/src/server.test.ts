import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCrawlQueue } from "./jobs/crawl-queue.js";
import type { JobRepository } from "./jobs/repository.js";
import { createJobRepository } from "./jobs/repository.js";
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

	afterEach(async () => {
		for (const server of servers) {
			await server.close();
		}
		for (const repository of repositories) {
			repository.close();
		}
		for (const file of tempFiles) {
			try {
				rmSync(file, { force: true });
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
		});
		beforeCreate?.({ crawlQueue, repository });

		const profilePath = resolve(
			process.cwd(),
			`.open-resume-companion/profile-${randomUUID()}.json`,
		);
		const resumePath = resolve(
			process.cwd(),
			`.open-resume-companion/resume-${randomUUID()}.json`,
		);
		tempFiles.push(profilePath, resumePath);

		const server = createServer({
			profilePath,
			resumePath,
			...options,
			jobRepository: repository,
			crawlQueue,
		});
		servers.push(server);
		repositories.push(repository);
		return { crawlQueue, repository, server };
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
			url: "/jobs",
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
			url: "/jobs",
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
			url: "/jobs",
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
			url: "/jobs",
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
		const created = repository.createJob({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			now: 1000,
		});
		repository.markFailed(created.id, { error: "Timeout", now: 1100 });

		expect(
			(await server.inject({ method: "GET", url: "/jobs" })).json(),
		).toMatchObject({ jobs: [expect.objectContaining({ id: "job-1" })] });

		expect(
			(
				await server.inject({ method: "POST", url: "/jobs/job-1/retry-crawl" })
			).json(),
		).toMatchObject({ id: "job-1", crawlStatus: "pending" });
		expect(crawlQueue.enqueue).toHaveBeenCalledWith("job-1");

		expect(
			(await server.inject({ method: "GET", url: "/jobs/job-1" })).json(),
		).toMatchObject({ id: "job-1" });

		const deleteResponse = await server.inject({
			method: "DELETE",
			url: "/jobs/job-1",
		});
		expect(deleteResponse.statusCode).toBe(200);
		expect(deleteResponse.json()).toEqual({ deleted: true });
	});

	it("returns not found responses for missing companion jobs", async () => {
		const { crawlQueue, server } = createTestServer();
		vi.spyOn(crawlQueue, "enqueue");

		const getResponse = await server.inject({
			method: "GET",
			url: "/jobs/missing-job",
		});
		expect(getResponse.statusCode).toBe(404);
		expect(getResponse.json()).toEqual({ error: "Job not found" });

		const retryResponse = await server.inject({
			method: "POST",
			url: "/jobs/missing-job/retry-crawl",
		});
		expect(retryResponse.statusCode).toBe(404);
		expect(retryResponse.json()).toEqual({ error: "Job not found" });
		expect(crawlQueue.enqueue).not.toHaveBeenCalled();

		const deleteResponse = await server.inject({
			method: "DELETE",
			url: "/jobs/missing-job",
		});
		expect(deleteResponse.statusCode).toBe(200);
		expect(deleteResponse.json()).toEqual({ deleted: false });
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
		expect(document.paths["/jobs"].post).toMatchObject({
			operationId: "createJob",
			tags: ["Jobs"],
		});
		expect(document.paths["/jobs"].get).toMatchObject({
			operationId: "listJobs",
			tags: ["Jobs"],
		});
		expect(document.paths["/jobs/{id}"].get).toMatchObject({
			operationId: "getJob",
			tags: ["Jobs"],
		});
		expect(document.paths["/jobs/{id}/retry-crawl"].post).toMatchObject({
			operationId: "retryJobCrawl",
			tags: ["Jobs"],
		});
		expect(document.components.schemas).toMatchObject({
			CompanionJob: expect.any(Object),
			CompanionJobsResponse: expect.any(Object),
			CreateJobRequest: expect.any(Object),
			CompanionErrorResponse: expect.any(Object),
			DeleteJobResponse: expect.any(Object),
			HealthResponse: expect.any(Object),
		});
		expect(
			document.components.schemas.CreateJobRequest.properties.sourceUrl,
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
});
