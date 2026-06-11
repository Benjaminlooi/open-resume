import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCrawlQueue } from "./jobs/crawl-queue.js";
import { createJobRepository } from "./jobs/repository.js";
import type { JobRepository } from "./jobs/repository.js";
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

	afterEach(async () => {
		for (const server of servers) {
			await server.close();
		}
		for (const repository of repositories) {
			repository.close();
		}
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
		const server = createServer({
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

		expect((await server.inject({ method: "GET", url: "/jobs" })).json())
			.toMatchObject({ jobs: [expect.objectContaining({ id: "job-1" })] });

		expect(
			(await server.inject({ method: "POST", url: "/jobs/job-1/retry-crawl" }))
				.json(),
		).toMatchObject({ id: "job-1", crawlStatus: "pending" });
		expect(crawlQueue.enqueue).toHaveBeenCalledWith("job-1");

		expect((await server.inject({ method: "GET", url: "/jobs/job-1" })).json())
			.toMatchObject({ id: "job-1" });

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
