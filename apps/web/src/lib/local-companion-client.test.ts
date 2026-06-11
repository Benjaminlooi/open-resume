import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createCompanionJob,
	deleteCompanionJob,
	listCompanionJobs,
	retryCompanionJobCrawl,
} from "./local-companion-client";

describe("local companion client", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("creates a companion job", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					id: "job-1",
					sourceUrl: "https://example.com/job",
					crawlStatus: "pending",
					crawlError: null,
					cleanedText: "",
					createdAt: 1791571200000,
					updatedAt: 1791571200000,
					crawledAt: null,
				}),
			})),
		);

		const result = await createCompanionJob("https://example.com/job");

		expect(result).toMatchObject({
			id: "job-1",
			crawlStatus: "pending",
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/jobs",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("lists companion jobs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ jobs: [] }),
			})),
		);

		await expect(listCompanionJobs()).resolves.toEqual([]);
	});

	it("retries and deletes companion jobs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("/jobs/job-1")) {
					return {
						ok: true,
						json: async () => ({
							deleted: true,
						}),
					};
				}
				return {
					ok: true,
					json: async () => ({
						id: "job-1",
						sourceUrl: "https://example.com/job",
						crawlStatus: "pending",
						crawlError: null,
						cleanedText: "",
						createdAt: 1,
						updatedAt: 2,
						crawledAt: null,
					}),
				};
			}),
		);

		await expect(retryCompanionJobCrawl("job-1")).resolves.toMatchObject({
			id: "job-1",
		});
		await expect(deleteCompanionJob("job-1")).resolves.toEqual({
			deleted: true,
		});
	});

	it("returns a user-facing error when the companion is unavailable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);

		await expect(listCompanionJobs()).rejects.toThrow(
			"Local companion is not reachable",
		);
	});
});
