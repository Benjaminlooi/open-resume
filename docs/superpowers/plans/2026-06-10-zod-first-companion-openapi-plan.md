# Zod-First Backend OpenAPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Zod the single source of truth for the backend Fastify API request, response, runtime validation, TypeScript inference, and OpenAPI generation.

**Architecture:** Replace manually registered Fastify JSON Schemas in `openapi.ts` with `fastify-type-provider-zod` compilers and Swagger transforms. Route schemas in `server.ts` will reference Zod schemas directly, while named OpenAPI component schemas are produced from Zod registry IDs. This removes drift between `schema.ts` and `openapi.ts`.

**Tech Stack:** Fastify 5, `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-type-provider-zod` v6+, Zod 4, Vitest, Redocly CLI, TypeScript.

---

## File Structure

- Modify `apps/backend/package.json`
  - Add `fastify-type-provider-zod` to backend dependencies.
- Modify `apps/backend/src/schema.ts`
  - Import from `zod`.
  - Add Zod metadata descriptions where the OpenAPI document currently has descriptions.
  - Add `healthResponseSchema`.
  - Register named schemas with `z.globalRegistry.add(..., { id })`.
- Modify `apps/backend/src/openapi.ts`
  - Remove all manual `server.addSchema()` calls.
  - Configure Fastify to use Zod validator and serializer compilers.
  - Configure `@fastify/swagger` with `jsonSchemaTransform` and `jsonSchemaTransformObject`.
- Modify `apps/backend/src/server.ts`
  - Create a typed Fastify instance with `ZodTypeProvider`.
  - Replace `$ref` route schemas with direct Zod schema references.
  - Remove manual `extractJobRequestSchema.safeParse(request.body)` because Fastify will validate the body before the handler.
  - Keep a custom error handler so invalid request responses preserve the existing `{ error, details }` shape.
- Modify `apps/backend/src/server.test.ts`
  - Tighten tests to prove Fastify/Zod validation rejects invalid bodies before extraction runs.
  - Assert generated OpenAPI components still include the named schemas.
- Modify `apps/backend/src/openapi.test.ts`
  - Add assertions that the OpenAPI schema reflects Zod validation, especially URL format and HTTP/HTTPS description.
- Regenerate `apps/backend/openapi.json`
  - Run `pnpm backend:openapi` after code changes.

---

### Task 1: Add Zod Type Provider Dependency

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install the package**

Run:

```bash
pnpm --filter @open-resume/backend add fastify-type-provider-zod
```

Expected: `apps/backend/package.json` gains a dependency similar to:

```json
"fastify-type-provider-zod": "^6.1.0"
```

Important: this repo uses `zod` `^4.4.3` and `fastify` `^5.8.0`, so the installed `fastify-type-provider-zod` must be `6.x` or newer. The package README and peer dependencies state `fastify-type-provider-zod >=6.x` matches Zod v4 and Fastify v5.

- [ ] **Step 2: Verify dependency tree**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
```

Expected: PASS or only pre-existing unrelated failures. If this fails because the installed provider version does not support Zod 4, install the latest v6+ release:

```bash
pnpm --filter @open-resume/backend add fastify-type-provider-zod@latest
```

- [ ] **Step 3: Commit dependency update**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore: add zod fastify type provider"
```

---

### Task 2: Make Zod Schemas the Named API Contract

**Files:**
- Modify: `apps/backend/src/schema.ts`
- Test: `apps/backend/src/schema.test.ts`

- [ ] **Step 1: Update schema tests first**

Modify `apps/backend/src/schema.test.ts` to include the health schema and registry-backed schemas:

```ts
import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import {
	extractJobRequestSchema,
	healthResponseSchema,
	jobExtractionResultSchema,
} from "./schema.js";

describe("backend schema", () => {
	it("accepts a valid health response", () => {
		const parsed = healthResponseSchema.parse({
			ok: true,
			service: "open-resume-backend",
		});

		expect(parsed.ok).toBe(true);
		expect(parsed.service).toBe("open-resume-backend");
	});

	it("rejects an invalid health response", () => {
		expect(() =>
			healthResponseSchema.parse({
				ok: "yes",
				service: "open-resume-backend",
			}),
		).toThrow(ZodError);
	});

	it("accepts a valid extraction request", () => {
		const parsed = extractJobRequestSchema.parse({
			url: "https://example.com/jobs/123",
		});

		expect(parsed.url).toBe("https://example.com/jobs/123");
	});

	it("rejects non-http URLs", () => {
		expect(() =>
			extractJobRequestSchema.parse({ url: "file:///etc/passwd" }),
		).toThrow(ZodError);
	});

	it("rejects completely invalid URLs like 'string'", () => {
		expect(() => extractJobRequestSchema.parse({ url: "string" })).toThrow(
			ZodError,
		);
	});

	it("accepts a normalized extraction result", () => {
		const parsed = jobExtractionResultSchema.parse({
			sourceUrl: "https://example.com/jobs/123",
			title: "Software Engineer",
			company: "Example Inc",
			location: "Remote",
			description: "Build useful software.",
			rawText: "Software Engineer at Example Inc. Build useful software.",
			extractionMethod: "json-ld",
			extractedAt: 1791571200000,
		});

		expect(parsed.extractionMethod).toBe("json-ld");
	});

	it("registers named schemas for OpenAPI component generation", () => {
		expect(z.globalRegistry.get(healthResponseSchema)?.id).toBe(
			"HealthResponse",
		);
		expect(z.globalRegistry.get(extractJobRequestSchema)?.id).toBe(
			"ExtractJobRequest",
		);
		expect(z.globalRegistry.get(jobExtractionResultSchema)?.id).toBe(
			"JobExtractionResult",
		);
	});
});
```

- [ ] **Step 2: Run schema tests and verify failure**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/schema.test.ts
```

Expected: FAIL because `healthResponseSchema` does not exist and Zod is still imported from `zod`.

- [ ] **Step 3: Replace `schema.ts` with Zod-first contract definitions**

Modify `apps/backend/src/schema.ts` to:

```ts
import { z } from "zod";

const httpUrlSchema = z
	.string()
	.url()
	.refine((value) => {
		try {
			const url = new URL(value);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}, "URL must use http or https");

export const healthResponseSchema = z
	.object({
		ok: z.boolean(),
		service: z.string(),
	})
	.strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const extractJobRequestSchema = z
	.object({
		url: httpUrlSchema.describe("HTTP or HTTPS job posting URL to extract."),
	})
	.strict();

export type ExtractJobRequest = z.infer<typeof extractJobRequestSchema>;

export const extractionMethodSchema = z.enum([
	"json-ld",
	"readability",
	"playwright",
]);

export const jobExtractionResultSchema = z
	.object({
		sourceUrl: httpUrlSchema,
		title: z.string(),
		company: z.string(),
		location: z.string(),
		description: z.string(),
		rawText: z.string(),
		extractionMethod: extractionMethodSchema,
		extractedAt: z
			.number()
			.describe("Unix timestamp in milliseconds."),
	})
	.strict();

export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

export const backendErrorResponseSchema = z
	.object({
		error: z.string(),
		details: z.string().optional(),
	})
	.strict();

export type BackendErrorResponse = z.infer<
	typeof backendErrorResponseSchema
>;

z.globalRegistry.add(healthResponseSchema, { id: "HealthResponse" });
z.globalRegistry.add(extractJobRequestSchema, { id: "ExtractJobRequest" });
z.globalRegistry.add(jobExtractionResultSchema, { id: "JobExtractionResult" });
z.globalRegistry.add(backendErrorResponseSchema, {
	id: "BackendErrorResponse",
});
```

- [ ] **Step 4: Run schema tests and verify pass**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit schema contract change**

```bash
git add apps/backend/src/schema.ts apps/backend/src/schema.test.ts
git commit -m "refactor: register backend zod schemas"
```

---

### Task 3: Wire Fastify to Zod Validation and OpenAPI Generation

**Files:**
- Modify: `apps/backend/src/openapi.ts`
- Test: `apps/backend/src/server.test.ts`

- [ ] **Step 1: Add failing server OpenAPI assertions**

In `apps/backend/src/server.test.ts`, extend the `serves an OpenAPI document with backend route contracts` test after the `components.schemas` assertion:

```ts
		expect(document.components.schemas.ExtractJobRequest.properties.url).toMatchObject({
			type: "string",
			format: "uri",
			description: "HTTP or HTTPS job posting URL to extract.",
		});
		expect(document.components.schemas.JobExtractionResult.properties.extractedAt).toMatchObject({
			type: "number",
			description: "Unix timestamp in milliseconds.",
		});
```

- [ ] **Step 2: Run server OpenAPI test and verify failure**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/server.test.ts
```

Expected: FAIL until Swagger uses the Zod transform and component schemas are generated from the Zod registry.

- [ ] **Step 3: Replace manual JSON Schema registration in `openapi.ts`**

Modify `apps/backend/src/openapi.ts` to:

```ts
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import {
	jsonSchemaTransform,
	jsonSchemaTransformObject,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import "./schema.js";

export function registerOpenApi(server: FastifyInstance) {
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.register(swagger, {
		openapi: {
			openapi: "3.0.3",
			info: {
				title: "Open Resume Backend API",
				version: "0.1.0",
				description:
					"Local backend service for extracting job details from pasted job URLs.",
			},
			tags: [
				{ name: "System", description: "Operational backend endpoints." },
				{
					name: "Extraction",
					description: "Job posting extraction endpoints.",
				},
			],
		},
		transform: jsonSchemaTransform,
		transformObject: jsonSchemaTransformObject,
	});

	server.register(swaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: true,
		},
	});
}
```

The side-effect import of `./schema.js` ensures Zod registry IDs are loaded before the Swagger document is generated.

- [ ] **Step 4: Run server OpenAPI test and verify pass**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit OpenAPI wiring**

```bash
git add apps/backend/src/openapi.ts apps/backend/src/server.test.ts
git commit -m "refactor: generate openapi from zod schemas"
```

---

### Task 4: Use Zod Schemas Directly in Routes

**Files:**
- Modify: `apps/backend/src/server.ts`
- Test: `apps/backend/src/server.test.ts`

- [ ] **Step 1: Tighten request validation tests**

In `apps/backend/src/server.test.ts`, update the invalid request tests to also assert the extractor is not called:

```ts
	it("rejects invalid extraction requests", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "POST",
			url: "/extract-job",
			payload: { url: "file:///etc/passwd" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			error: "Invalid extraction request",
		});
		expect(extractWithPlaywright).not.toHaveBeenCalled();
	});

	it("rejects completely invalid URLs with 400 bad request", async () => {
		const server = createServer();
		const response = await server.inject({
			method: "POST",
			url: "/extract-job",
			payload: { url: "string" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			error: "Invalid extraction request",
		});
		expect(extractWithPlaywright).not.toHaveBeenCalled();
	});
```

- [ ] **Step 2: Run server tests and verify current behavior**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/server.test.ts
```

Expected: PASS before the route refactor. This proves the strengthened behavior is already expected.

- [ ] **Step 3: Replace `$ref` route schemas with Zod schemas and type provider**

Modify imports in `apps/backend/src/server.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { extractWithPlaywright } from "./extract/playwright.js";
import { registerOpenApi } from "./openapi.js";
import {
	backendErrorResponseSchema,
	extractJobRequestSchema,
	healthResponseSchema,
	jobExtractionResultSchema,
} from "./schema.js";
```

In `createServer`, create a Zod-aware route instance after constructing Fastify:

```ts
	const server = Fastify({
		logger: createLoggerOptions(options),
	});
	const typedServer = server.withTypeProvider<ZodTypeProvider>();
```

After `registerOpenApi(server);`, add the validation error handler:

```ts
	server.setErrorHandler((err, request, reply) => {
		if (hasZodFastifySchemaValidationErrors(err)) {
			request.log.warn(
				{ details: JSON.stringify(err.validation) },
				"invalid extraction request",
			);
			return reply.status(400).send({
				error: "Invalid extraction request",
				details: JSON.stringify(err.validation),
			});
		}

		return reply.send(err);
	});
```

Inside `server.after`, replace `server.get` / `server.post` route registrations with `typedServer.get` / `typedServer.post`, and replace schemas:

```ts
		typedServer.get(
			"/health",
			{
				schema: {
					operationId: "getHealth",
					tags: ["System"],
					summary: "Check backend health",
					response: {
						200: healthResponseSchema,
					},
				},
			},
			async () => ({
				ok: true,
				service: "open-resume-backend",
			}),
		);

		typedServer.get(
			"/openapi.json",
			{
				schema: {
					hide: true,
				},
			},
			async () => server.swagger(),
		);

		typedServer.post(
			"/extract-job",
			{
				schema: {
					operationId: "extractJob",
					tags: ["Extraction"],
					summary: "Extract job details from a URL",
					body: extractJobRequestSchema,
					response: {
						200: jobExtractionResultSchema,
						400: backendErrorResponseSchema,
						500: backendErrorResponseSchema,
						502: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				request.log.info({ url: request.body.url }, "extract job started");
				try {
					const result = await extractWithPlaywright(request.body.url, {
						logger: request.log,
						logScrapedData,
					});
					request.log.info(
						{
							method: result.extractionMethod,
							descriptionLength: result.description.length,
						},
						"extracted job details",
					);
					return reply.send(result);
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : String(err);
					request.log.error(
						{ url: request.body.url, error: errorMessage },
						"failed to extract job with playwright",
					);
					return reply.status(502).send({
						error: "Failed to extract job details",
						details: errorMessage,
					});
				}
			},
		);
```

- [ ] **Step 4: Run server tests**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/server.test.ts
```

Expected: PASS. If the error handler returns a different details string, keep the exact `error: "Invalid extraction request"` shape and adjust only tests that assert `details`.

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
```

Expected: PASS. This is the proof that `request.body.url` is inferred from the Zod schema.

- [ ] **Step 6: Commit route migration**

```bash
git add apps/backend/src/server.ts apps/backend/src/server.test.ts
git commit -m "refactor: validate backend routes with zod"
```

---

### Task 5: Update Static OpenAPI Contract Tests and Artifact

**Files:**
- Modify: `apps/backend/src/openapi.test.ts`
- Modify: `apps/backend/openapi.json`

- [ ] **Step 1: Strengthen static OpenAPI tests**

In `apps/backend/src/openapi.test.ts`, add:

```ts
	it("should include zod-derived request validation details", () => {
		const requestSchema = spec.components?.schemas?.ExtractJobRequest;

		expect(requestSchema?.properties?.url).toMatchObject({
			type: "string",
			format: "uri",
			description: "HTTP or HTTPS job posting URL to extract.",
		});
	});

	it("should include zod-derived response descriptions", () => {
		const resultSchema = spec.components?.schemas?.JobExtractionResult;

		expect(resultSchema?.properties?.extractedAt).toMatchObject({
			type: "number",
			description: "Unix timestamp in milliseconds.",
		});
	});
```

- [ ] **Step 2: Run static OpenAPI tests and verify failure before regeneration**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/openapi.test.ts
```

Expected: FAIL because `apps/backend/openapi.json` has not been regenerated.

- [ ] **Step 3: Regenerate OpenAPI artifact**

Run:

```bash
pnpm backend:openapi
```

Expected: `apps/backend/openapi.json` is rewritten with schemas generated from Zod.

- [ ] **Step 4: Run static OpenAPI tests and lint**

Run:

```bash
pnpm --filter @open-resume/backend test -- src/openapi.test.ts
pnpm --filter @open-resume/backend openapi:lint
```

Expected: PASS for both commands.

- [ ] **Step 5: Commit OpenAPI artifact update**

```bash
git add apps/backend/src/openapi.test.ts apps/backend/openapi.json
git commit -m "test: assert zod generated openapi contract"
```

---

### Task 6: Full Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run backend verification commands**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
pnpm --filter @open-resume/backend test
pnpm --filter @open-resume/backend build
pnpm --filter @open-resume/backend openapi:lint
```

Expected: PASS for all commands.

- [ ] **Step 2: Run repo-level verification if time allows**

Run:

```bash
pnpm verify
```

Expected: PASS, unless unrelated pre-existing failures exist outside `apps/backend`.

- [ ] **Step 3: Inspect diff**

Run:

```bash
git diff --stat
git diff -- apps/backend/src/schema.ts apps/backend/src/openapi.ts apps/backend/src/server.ts
```

Expected:
- `openapi.ts` no longer contains `server.addSchema`.
- `server.ts` no longer contains `$ref:`.
- `server.ts` no longer manually calls `extractJobRequestSchema.safeParse`.
- Route `body` and `response` entries use Zod schemas directly.

- [ ] **Step 4: Final commit if needed**

If any verification-only fixes were made:

```bash
git add apps/backend
git commit -m "fix: complete zod first backend migration"
```

---

## Self-Review

- Spec coverage: The plan migrates schema ownership from manual JSON Schema in `openapi.ts` to Zod schemas in `schema.ts`, wires Fastify validation and serialization to Zod, updates OpenAPI generation, regenerates the static artifact, and verifies route behavior.
- Placeholder scan: No placeholders remain; every task includes exact files, code shape, commands, and expected results.
- Type consistency: Schema names are consistent across Zod registry IDs, tests, route schemas, and expected OpenAPI component names: `HealthResponse`, `ExtractJobRequest`, `JobExtractionResult`, and `BackendErrorResponse`.
