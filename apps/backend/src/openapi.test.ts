import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specUrl = new URL("../openapi.json", import.meta.url);
const spec = JSON.parse(readFileSync(specUrl, "utf8"));

const requiredSchemas = [
	"HealthResponse",
	"BackendErrorResponse",
	"CreateJobPostingRequest",
	"JobIdParams",
	"JobPosting",
	"JobPostingsResponse",
	"DeleteJobPostingResponse",
	"CandidateProfile",
	"ResumeSyncRequest",
	"OkResponse",
	"ResumeDetails",
	"ResumesResponse",
	"CreateResumeRequest",
	"UpdateResumeRequest",
	"DeleteResumeResponse",
] as const;

const requiredOperations = [
	{
		path: "/health",
		method: "get",
		operationId: "getHealth",
		tags: ["System"],
		responses: ["200"],
	},
	{
		path: "/profile",
		method: "get",
		operationId: "getProfile",
		tags: ["Profile"],
		responses: ["200", "500"],
	},
	{
		path: "/profile",
		method: "put",
		operationId: "updateProfile",
		tags: ["Profile"],
		responses: ["200", "500"],
	},
	{
		path: "/profile/resume",
		method: "get",
		operationId: "getSyncedResume",
		tags: ["Profile"],
		responses: ["200", "404", "500"],
	},
	{
		path: "/profile/resume",
		method: "put",
		operationId: "syncResume",
		tags: ["Profile"],
		responses: ["200", "500"],
	},
	{
		path: "/resumes",
		method: "get",
		operationId: "listResumes",
		tags: ["Resumes"],
		responses: ["200"],
	},
	{
		path: "/resumes",
		method: "post",
		operationId: "createResume",
		tags: ["Resumes"],
		responses: ["201", "400", "500"],
	},
	{
		path: "/resumes/{id}",
		method: "get",
		operationId: "getResume",
		tags: ["Resumes"],
		responses: ["200", "404"],
	},
	{
		path: "/resumes/{id}",
		method: "put",
		operationId: "updateResume",
		tags: ["Resumes"],
		responses: ["200", "404"],
	},
	{
		path: "/resumes/{id}",
		method: "delete",
		operationId: "deleteResume",
		tags: ["Resumes"],
		responses: ["200"],
	},
	{
		path: "/resumes/{id}/default",
		method: "put",
		operationId: "setDefaultResume",
		tags: ["Resumes"],
		responses: ["200", "404"],
	},
	{
		path: "/resumes/default",
		method: "delete",
		operationId: "clearDefaultResume",
		tags: ["Resumes"],
		responses: ["200"],
	},
	{
		path: "/job-postings",
		method: "post",
		operationId: "createJobPosting",
		tags: ["Job Postings"],
		responses: ["201", "400", "500"],
	},
	{
		path: "/job-postings",
		method: "get",
		operationId: "listJobPostings",
		tags: ["Job Postings"],
		responses: ["200"],
	},
	{
		path: "/job-postings/{id}",
		method: "get",
		operationId: "getJobPosting",
		tags: ["Job Postings"],
		responses: ["200", "404"],
	},
	{
		path: "/job-postings/{id}/retry-crawl",
		method: "post",
		operationId: "retryJobPostingCrawl",
		tags: ["Job Postings"],
		responses: ["200", "404"],
	},
	{
		path: "/job-postings/{id}",
		method: "delete",
		operationId: "deleteJobPosting",
		tags: ["Job Postings"],
		responses: ["200"],
	},
] as const;

describe("OpenAPI Contract Validation", () => {
	it("should match OpenAPI version 3.0.3", () => {
		expect(spec.openapi).toBe("3.0.3");
	});

	it("should have required info fields", () => {
		expect(spec.info?.title).toBeDefined();
		expect(spec.info?.version).toBeDefined();
	});

	it.each(requiredSchemas)("should define schema %s", (schemaName) => {
		expect(spec.components?.schemas?.[schemaName]).toBeDefined();
	});

	it("should include zod-derived request validation details", () => {
		const requestSchema = spec.components?.schemas?.CreateJobPostingRequest;

		expect(requestSchema?.properties?.sourceUrl).toMatchObject({
			type: "string",
			format: "uri",
			description: "HTTP or HTTPS job posting URL to crawl.",
		});
	});

	it("should include zod-derived response descriptions", () => {
		const resultSchema = spec.components?.schemas?.JobPosting;

		expect(resultSchema?.properties?.createdAt).toMatchObject({
			type: "number",
			description: "Unix timestamp in milliseconds.",
		});
	});

	describe("Operations Validation", () => {
		for (const op of requiredOperations) {
			it(`should define ${op.method.toUpperCase()} ${op.path} correctly`, () => {
				const pathItem = spec.paths?.[op.path];
				expect(pathItem).toBeDefined();

				const method = pathItem[op.method];
				expect(method).toBeDefined();
				expect(method.operationId).toBe(op.operationId);

				for (const tag of op.tags) {
					expect(method.tags).toContain(tag);
				}

				for (const statusCode of op.responses) {
					expect(method.responses?.[statusCode]).toBeDefined();
				}
			});
		}
	});

	it("should use a resume-specific delete response schema", () => {
		expect(
			spec.paths?.["/resumes/{id}"]?.delete?.responses?.["200"]?.content?.[
				"application/json"
			]?.schema,
		).toEqual({
			$ref: "#/components/schemas/DeleteResumeResponse",
		});
	});

	it("should hide internal /openapi.json route", () => {
		expect(spec.paths?.["/openapi.json"]).toBeUndefined();
	});
});
