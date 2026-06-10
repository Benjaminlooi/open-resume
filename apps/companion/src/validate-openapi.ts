import { readFile } from "node:fs/promises";

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

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

const specUrl = new URL("../openapi.json", import.meta.url);
const spec = JSON.parse(await readFile(specUrl, "utf8"));

assert(spec.openapi === "3.0.3", "OpenAPI version must be 3.0.3");
assert(spec.info?.title, "OpenAPI info.title is required");
assert(spec.info?.version, "OpenAPI info.version is required");

for (const schemaName of requiredSchemas) {
	assert(
		spec.components?.schemas?.[schemaName],
		`Missing reusable schema: ${schemaName}`,
	);
}

for (const operation of requiredOperations) {
	const pathItem = spec.paths?.[operation.path];
	assert(pathItem, `Missing path: ${operation.path}`);
	const method = pathItem[operation.method];
	assert(
		method,
		`Missing operation: ${operation.method.toUpperCase()} ${operation.path}`,
	);
	assert(
		method.operationId === operation.operationId,
		`Invalid operationId for ${operation.method.toUpperCase()} ${operation.path}`,
	);
	for (const tag of operation.tags) {
		assert(
			method.tags?.includes(tag),
			`Missing tag ${tag} for ${operation.method.toUpperCase()} ${operation.path}`,
		);
	}
	for (const statusCode of operation.responses) {
		assert(
			method.responses?.[statusCode],
			`Missing ${statusCode} response for ${operation.method.toUpperCase()} ${operation.path}`,
		);
	}
}

assert(
	!spec.paths?.["/openapi.json"],
	"Internal /openapi.json route must be hidden",
);
