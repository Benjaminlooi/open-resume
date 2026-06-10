import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specUrl = new URL("../openapi.json", import.meta.url);
const spec = JSON.parse(readFileSync(specUrl, "utf8"));

const requiredSchemas = [
	"HealthResponse",
	"ExtractJobRequest",
	"JobExtractionResult",
	"CompanionErrorResponse",
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
		path: "/extract-job",
		method: "post",
		operationId: "extractJob",
		tags: ["Extraction"],
		responses: ["200", "400", "500", "502"],
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

	it("should hide internal /openapi.json route", () => {
		expect(spec.paths?.["/openapi.json"]).toBeUndefined();
	});
});
