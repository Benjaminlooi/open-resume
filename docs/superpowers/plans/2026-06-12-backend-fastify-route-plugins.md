# Backend Fastify Route Plugins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the backend Fastify server so endpoint registration lives in focused route plugins and app infrastructure lives in named Fastify plugins.

**Architecture:** Keep `createServer(options)` as the composition root. Add `fastify-plugin` for infrastructure plugins that should apply at the app level, and use explicit route plugin factories for `system`, `profile`, `resumes`, and `jobs`. Preserve all URLs, response contracts, OpenAPI operation IDs, startup recovery, and repository ownership behavior.

**Tech Stack:** Fastify 5, `fastify-plugin`, `@fastify/cors`, `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-type-provider-zod`, Zod contracts from `@open-resume/contracts`, Vitest, TypeScript.

---

## File Structure

- Modify: `apps/backend/package.json`
  - Add `fastify-plugin` as a runtime dependency.
- Modify: `pnpm-lock.yaml`
  - Updated by `pnpm --filter @open-resume/backend add fastify-plugin`.
- Create: `apps/backend/src/plugins/cors.ts`
  - Registers the current localhost-only CORS policy.
- Create: `apps/backend/src/plugins/error-handler.ts`
  - Registers the current Zod-aware error handler and generic error response behavior.
- Create: `apps/backend/src/plugins/openapi.ts`
  - Keeps validator/serializer setup, Swagger registration, Swagger UI registration, and adds missing `Profile` and `Resumes` tag metadata.
- Modify then delete: `apps/backend/src/openapi.ts`
  - Temporarily re-export from `plugins/openapi.ts` so intermediate commits typecheck, then remove after `server.ts` imports the plugin path directly.
- Create: `apps/backend/src/routes/context.ts`
  - Defines the typed route context passed from `server.ts` into route plugins.
- Create: `apps/backend/src/routes/system-routes.ts`
  - Registers `/health` and `/openapi.json`.
- Create: `apps/backend/src/routes/profile-routes.ts`
  - Registers `/profile` and `/profile/resume`.
- Create: `apps/backend/src/routes/resume-routes.ts`
  - Registers `/resumes` CRUD and default resume endpoints.
- Create: `apps/backend/src/routes/job-routes.ts`
  - Registers `/jobs` CRUD and crawl retry endpoints.
- Create: `apps/backend/src/profile/default-profile.ts`
  - Exports the current default candidate profile object.
- Modify: `apps/backend/src/server.ts`
  - Remove inline route registration and infrastructure setup.
  - Create dependencies, register app plugins, assemble `CompanionRouteContext`, register route plugins, preserve startup recovery, and return the server.
- Modify if needed: `apps/backend/src/openapi.test.ts`
  - Update import path if it imports `registerOpenApi` from the old location.

---

### Task 1: Add `fastify-plugin`

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Add the dependency**

Run:

```bash
pnpm --filter @open-resume/backend add fastify-plugin
```

Expected:

- `apps/backend/package.json` includes `"fastify-plugin": "^5.x.x"` or the current compatible version selected by pnpm.
- `pnpm-lock.yaml` is updated.
- The command exits with code 0.

- [x] **Step 2: Verify dependency metadata**

Run:

```bash
pnpm --filter @open-resume/backend list fastify-plugin
```

Expected output includes:

```text
fastify-plugin
```

- [x] **Step 3: Commit**

Run:

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore(backend): add fastify plugin helper"
```

Expected: commit succeeds.

---

### Task 2: Extract App Infrastructure Plugins

**Files:**
- Create: `apps/backend/src/plugins/cors.ts`
- Create: `apps/backend/src/plugins/error-handler.ts`
- Create: `apps/backend/src/plugins/openapi.ts`
- Modify: `apps/backend/src/openapi.ts`

- [x] **Step 1: Create the CORS plugin**

Create `apps/backend/src/plugins/cors.ts`:

```ts
import cors from "@fastify/cors";
import fp from "fastify-plugin";

export const registerCors = fp(async (server) => {
	await server.register(cors, {
		origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
		methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
	});
});
```

- [x] **Step 2: Create the error handler plugin**

Create `apps/backend/src/plugins/error-handler.ts`:

```ts
import type { FastifyError } from "fastify";
import fp from "fastify-plugin";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

export const registerErrorHandler = fp(async (server) => {
	server.setErrorHandler((err: FastifyError, request, reply) => {
		if (hasZodFastifySchemaValidationErrors(err)) {
			request.log.warn(
				{ details: JSON.stringify(err.validation) },
				"invalid backend request",
			);
			return reply.status(400).send({
				error: "Invalid backend request",
				details: JSON.stringify(err.validation),
			});
		}

		const statusCode =
			typeof err.statusCode === "number" && err.statusCode >= 400
				? err.statusCode
				: 500;

		return reply.status(statusCode).send({
			error: err.message || "Internal server error",
		});
	});
});
```

- [x] **Step 3: Create OpenAPI registration plugin**

Create `apps/backend/src/plugins/openapi.ts`:

```ts
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fp from "fastify-plugin";
import {
	jsonSchemaTransform,
	jsonSchemaTransformObject,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import "../schema.js";

export const registerOpenApi = fp(async (server) => {
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	await server.register(swagger, {
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
					name: "Profile",
					description: "Candidate profile and synced default resume endpoints.",
				},
				{
					name: "Resumes",
					description: "Saved resume management endpoints.",
				},
				{
					name: "Jobs",
					description: "Backend job intake and crawl lifecycle endpoints.",
				},
			],
		},
		transform: jsonSchemaTransform,
		transformObject: jsonSchemaTransformObject,
	});

	await server.register(swaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: true,
		},
	});
});
```

- [x] **Step 4: Keep the old OpenAPI import path working temporarily**

Replace `apps/backend/src/openapi.ts` with:

```ts
export { registerOpenApi } from "./plugins/openapi.js";
```

- [x] **Step 5: Typecheck the extracted plugins**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
```

Expected: PASS.

- [x] **Step 6: Commit**

Run:

```bash
git add apps/backend/src/plugins/cors.ts apps/backend/src/plugins/error-handler.ts apps/backend/src/plugins/openapi.ts apps/backend/src/openapi.ts
git commit -m "refactor(backend): extract app plugins"
```

Expected: commit succeeds.

---

### Task 3: Create Shared Route Context And Default Profile

**Files:**
- Create: `apps/backend/src/routes/context.ts`
- Create: `apps/backend/src/profile/default-profile.ts`

- [x] **Step 1: Create route context type**

Create `apps/backend/src/routes/context.ts`:

```ts
import type { CrawlQueue } from "../jobs/crawl-queue.js";
import type { JobRepository } from "../jobs/repository.js";

export interface CompanionRouteContext {
	jobRepository: JobRepository;
	crawlQueue: CrawlQueue;
	getProfilePath(): string;
}
```

- [x] **Step 2: Extract the default profile**

Create `apps/backend/src/profile/default-profile.ts`:

```ts
export const defaultProfile = {
	candidate: {
		fullName: "Benjamin Looi",
		email: "hello@benjaminlooi.dev",
		phone: "+60 12-4065-711",
		location: "Kuala Lumpur, Malaysia",
		linkedin: "linkedin.com/in/benjaminlooi",
		portfolioUrl: "https://www.benjaminlooi.dev",
		github: "github.com/benjaminlooi",
		twitter: "",
	},
	targetRoles: {
		primary: ["Senior Full Stack Engineer", "Senior Frontend Engineer"],
		archetypes: [
			{
				name: "Full Stack Product Engineer",
				level: "Senior",
				fit: "primary" as const,
			},
		],
	},
	narrative: {
		headline: "Product-minded Full Stack Engineer",
		exitStory: "After 5+ years shipping web systems...",
		superpowers: ["Modernizing legacy frontends"],
		proofPoints: [],
	},
	compensation: {
		targetRange: "Global remote",
		currency: "USD",
		minimum: "$50k",
		preferred: "$60k+",
		locationFlexibility: "Global remote-first",
	},
	location: {
		country: "Malaysia",
		city: "Kuala Lumpur",
		timezone: "ICT / UTC+7",
		visaStatus: "Unspecified",
		onsiteAvailability: "Remote-first preferred",
		remotePolicy: "Prioritize global remote",
	},
};
```

- [x] **Step 3: Commit**

Run:

```bash
git add apps/backend/src/routes/context.ts apps/backend/src/profile/default-profile.ts
git commit -m "refactor(backend): add route context"
```

Expected: commit succeeds.

---

### Task 4: Extract Route Plugins

**Files:**
- Create: `apps/backend/src/routes/system-routes.ts`
- Create: `apps/backend/src/routes/profile-routes.ts`
- Create: `apps/backend/src/routes/resume-routes.ts`
- Create: `apps/backend/src/routes/job-routes.ts`

- [x] **Step 1: Create system routes**

Create `apps/backend/src/routes/system-routes.ts`:

```ts
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthResponseSchema } from "../schema.js";
import type { CompanionRouteContext } from "./context.js";

export function createSystemRoutes(
	_context: CompanionRouteContext,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();

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
	};
}
```

- [x] **Step 2: Create profile routes**

Create `apps/backend/src/routes/profile-routes.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { defaultProfile } from "../profile/default-profile.js";
import {
	candidateProfileSchema,
	backendErrorResponseSchema,
	okResponseSchema,
	resumeSyncRequestSchema,
	syncedResumeResponseSchema,
} from "../schema.js";
import type { CompanionRouteContext } from "./context.js";

const profileResumeId = "profile-resume";

export function createProfileRoutes(
	context: CompanionRouteContext,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();
		const { jobRepository } = context;

		typedServer.get(
			"/profile",
			{
				schema: {
					operationId: "getProfile",
					tags: ["Profile"],
					summary: "Get candidate profile",
					response: {
						200: candidateProfileSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async () => {
				const profilePath = context.getProfilePath();
				if (!existsSync(profilePath)) {
					mkdirSync(dirname(profilePath), { recursive: true });
					writeFileSync(profilePath, JSON.stringify(defaultProfile, null, 2));
					return defaultProfile;
				}
				try {
					const data = readFileSync(profilePath, "utf8");
					return JSON.parse(data);
				} catch (_err) {
					throw new Error("Failed to read candidate profile");
				}
			},
		);

		typedServer.put(
			"/profile",
			{
				schema: {
					operationId: "updateProfile",
					tags: ["Profile"],
					summary: "Update candidate profile",
					body: candidateProfileSchema,
					response: {
						200: candidateProfileSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const profilePath = context.getProfilePath();
				mkdirSync(dirname(profilePath), { recursive: true });
				try {
					writeFileSync(profilePath, JSON.stringify(request.body, null, 2));
					return request.body;
				} catch (_err) {
					return reply
						.status(500)
						.send({ error: "Failed to save candidate profile" });
				}
			},
		);

		typedServer.get(
			"/profile/resume",
			{
				schema: {
					operationId: "getSyncedResume",
					tags: ["Profile"],
					summary: "Get synced default resume",
					response: {
						200: syncedResumeResponseSchema,
						404: backendErrorResponseSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async (_request, reply) => {
				const defaultResume = jobRepository.getDefaultResume();
				if (!defaultResume) {
					return reply.status(404).send({ error: "Synced resume not found" });
				}
				return defaultResume.content;
			},
		);

		typedServer.put(
			"/profile/resume",
			{
				schema: {
					operationId: "syncResume",
					tags: ["Profile"],
					summary: "Sync default resume",
					body: resumeSyncRequestSchema,
					response: {
						200: okResponseSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async (request) => {
				const now = Date.now();
				const existingResume = jobRepository.getResume(profileResumeId);
				if (existingResume) {
					jobRepository.updateResume(profileResumeId, {
						content: request.body.resume,
						now,
					});
				} else {
					jobRepository.createResume({
						id: profileResumeId,
						name: "Profile Resume",
						templateId: "default",
						content: request.body.resume,
						now,
					});
				}
				jobRepository.setDefaultResume(profileResumeId, now);
				return { ok: true };
			},
		);
	};
}
```

- [x] **Step 3: Create resume routes**

Create `apps/backend/src/routes/resume-routes.ts`:

```ts
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	backendErrorResponseSchema,
	createResumeRequestSchema,
	deleteJobResponseSchema,
	jobIdParamsSchema,
	okResponseSchema,
	resumeDetailsSchema,
	resumesResponseSchema,
	updateResumeRequestSchema,
} from "../schema.js";
import type { CompanionRouteContext } from "./context.js";

// Fastify Swagger crashes when a registered component ref is used for params.
const routeResumeIdParamsSchema = jobIdParamsSchema.extend({});

export function createResumeRoutes(
	context: CompanionRouteContext,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();
		const { jobRepository } = context;

		typedServer.get(
			"/resumes",
			{
				schema: {
					operationId: "listResumes",
					tags: ["Resumes"],
					summary: "List saved resumes",
					response: {
						200: resumesResponseSchema,
					},
				},
			},
			async () => ({
				resumes: jobRepository.listResumes(),
			}),
		);

		typedServer.post(
			"/resumes",
			{
				schema: {
					operationId: "createResume",
					tags: ["Resumes"],
					summary: "Create a saved resume",
					body: createResumeRequestSchema,
					response: {
						201: resumeDetailsSchema,
						400: backendErrorResponseSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = jobRepository.createResume({
					...request.body,
					now: Date.now(),
				});
				return reply.status(201).send(resume);
			},
		);

		typedServer.get(
			"/resumes/:id",
			{
				schema: {
					operationId: "getResume",
					tags: ["Resumes"],
					summary: "Get a saved resume",
					params: routeResumeIdParamsSchema,
					response: {
						200: resumeDetailsSchema,
						404: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = jobRepository.getResume(request.params.id);
				if (!resume) {
					return reply.status(404).send({ error: "Resume not found" });
				}
				return reply.send(resume);
			},
		);

		typedServer.put(
			"/resumes/:id",
			{
				schema: {
					operationId: "updateResume",
					tags: ["Resumes"],
					summary: "Update a saved resume",
					params: routeResumeIdParamsSchema,
					body: updateResumeRequestSchema,
					response: {
						200: resumeDetailsSchema,
						404: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = jobRepository.updateResume(request.params.id, {
					...request.body,
					now: Date.now(),
				});
				if (!resume) {
					return reply.status(404).send({ error: "Resume not found" });
				}
				return reply.send(resume);
			},
		);

		typedServer.put(
			"/resumes/:id/default",
			{
				schema: {
					operationId: "setDefaultResume",
					tags: ["Resumes"],
					summary: "Set the default resume",
					params: routeResumeIdParamsSchema,
					response: {
						200: resumeDetailsSchema,
						404: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const resume = jobRepository.setDefaultResume(
					request.params.id,
					Date.now(),
				);
				if (!resume) {
					return reply.status(404).send({ error: "Resume not found" });
				}
				return reply.send(resume);
			},
		);

		typedServer.delete(
			"/resumes/default",
			{
				schema: {
					operationId: "clearDefaultResume",
					tags: ["Resumes"],
					summary: "Clear the default resume",
					response: {
						200: okResponseSchema,
					},
				},
			},
			async () => {
				jobRepository.clearDefaultResume(Date.now());
				return { ok: true };
			},
		);

		typedServer.delete(
			"/resumes/:id",
			{
				schema: {
					operationId: "deleteResume",
					tags: ["Resumes"],
					summary: "Delete a saved resume",
					params: routeResumeIdParamsSchema,
					response: {
						200: deleteJobResponseSchema,
					},
				},
			},
			async (request) => ({
				deleted: jobRepository.deleteResume(request.params.id),
			}),
		);
	};
}
```

- [x] **Step 4: Create job routes**

Create `apps/backend/src/routes/job-routes.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	backendErrorResponseSchema,
	backendJobSchema,
	backendJobsResponseSchema,
	createJobRequestSchema,
	deleteJobResponseSchema,
	jobIdParamsSchema,
} from "../schema.js";
import type { CompanionRouteContext } from "./context.js";

// Fastify Swagger crashes when a registered component ref is used for params.
const routeJobIdParamsSchema = jobIdParamsSchema.extend({});

export function createJobRoutes(
	context: CompanionRouteContext,
): FastifyPluginAsync {
	return async (server) => {
		const typedServer = server.withTypeProvider<ZodTypeProvider>();
		const { crawlQueue, jobRepository } = context;

		typedServer.post(
			"/jobs",
			{
				schema: {
					operationId: "createJob",
					tags: ["Jobs"],
					summary: "Create a backend job and enqueue crawling",
					body: createJobRequestSchema,
					response: {
						201: backendJobSchema,
						400: backendErrorResponseSchema,
						500: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = jobRepository.createJob({
					id: randomUUID(),
					sourceUrl: request.body.sourceUrl,
					now: Date.now(),
				});
				crawlQueue.enqueue(job.id);
				return reply.status(201).send(job);
			},
		);

		typedServer.get(
			"/jobs",
			{
				schema: {
					operationId: "listJobs",
					tags: ["Jobs"],
					summary: "List backend jobs",
					response: {
						200: backendJobsResponseSchema,
					},
				},
			},
			async () => ({
				jobs: jobRepository.listJobs(),
			}),
		);

		typedServer.get(
			"/jobs/:id",
			{
				schema: {
					operationId: "getJob",
					tags: ["Jobs"],
					summary: "Get a backend job",
					params: routeJobIdParamsSchema,
					response: {
						200: backendJobSchema,
						404: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = jobRepository.getJob(request.params.id);
				if (!job) {
					return reply.status(404).send({ error: "Job not found" });
				}
				return reply.send(job);
			},
		);

		typedServer.post(
			"/jobs/:id/retry-crawl",
			{
				schema: {
					operationId: "retryJobCrawl",
					tags: ["Jobs"],
					summary: "Retry crawling a backend job",
					params: routeJobIdParamsSchema,
					response: {
						200: backendJobSchema,
						404: backendErrorResponseSchema,
					},
				},
			},
			async (request, reply) => {
				const job = jobRepository.resetForRetry(request.params.id, Date.now());
				if (!job) {
					return reply.status(404).send({ error: "Job not found" });
				}
				crawlQueue.enqueue(job.id);
				return reply.send(job);
			},
		);

		typedServer.delete(
			"/jobs/:id",
			{
				schema: {
					operationId: "deleteJob",
					tags: ["Jobs"],
					summary: "Delete a backend job",
					params: routeJobIdParamsSchema,
					response: {
						200: deleteJobResponseSchema,
					},
				},
			},
			async (request) => ({
				deleted: jobRepository.deleteJob(request.params.id),
			}),
		);
	};
}
```

- [x] **Step 5: Commit**

Run:

```bash
git add apps/backend/src/routes/system-routes.ts apps/backend/src/routes/profile-routes.ts apps/backend/src/routes/resume-routes.ts apps/backend/src/routes/job-routes.ts
git commit -m "refactor(backend): extract route plugins"
```

Expected: commit succeeds.

---

### Task 5: Wire Plugins From `server.ts`

**Files:**
- Modify: `apps/backend/src/server.ts`
- Delete: `apps/backend/src/openapi.ts`

- [x] **Step 1: Replace imports at the top of `server.ts`**

Change the top of `apps/backend/src/server.ts` to:

```ts
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Fastify from "fastify";
import { crawlCleanedTextWithPlaywright } from "./extract/playwright.js";
import type { CrawlQueue } from "./jobs/crawl-queue.js";
import { createCrawlQueue } from "./jobs/crawl-queue.js";
import type { JobRepository } from "./jobs/repository.js";
import { createJobRepository } from "./jobs/repository.js";
import { registerCors } from "./plugins/cors.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerOpenApi } from "./plugins/openapi.js";
import { createJobRoutes } from "./routes/job-routes.js";
import { createProfileRoutes } from "./routes/profile-routes.js";
import { createResumeRoutes } from "./routes/resume-routes.js";
import { createSystemRoutes } from "./routes/system-routes.js";
```

Keep the existing `LogStream`, `CreateServerOptions`, `isScrapedDataLoggingEnabled`, `createLoggerOptions`, `getDefaultDatabasePath`, `getProfilePath`, and `getResumePath` definitions.

- [x] **Step 2: Replace the body of `createServer` after crawl queue creation**

Inside `createServer`, remove:

- `const typedServer = server.withTypeProvider<ZodTypeProvider>();`
- inline `registerOpenApi(server)` call
- inline `server.setErrorHandler(...)`
- inline `server.register(cors, ...)`
- the full `server.after(() => { ...all routes... })` block

After the `crawlQueue` definition, use:

```ts
	server.addHook("onClose", async () => {
		if (ownsRepository) {
			jobRepository.close();
		}
	});

	server.register(registerOpenApi);
	server.register(registerErrorHandler);
	server.register(registerCors);

	server.after(() => {
		const routeContext = {
			jobRepository,
			crawlQueue,
			getProfilePath: () => getProfilePath(options),
		};

		server.register(createSystemRoutes(routeContext));
		server.register(createProfileRoutes(routeContext));
		server.register(createResumeRoutes(routeContext));
		server.register(createJobRoutes(routeContext));
	});

	if (options.recoverJobsOnStartup) {
		crawlQueue.enqueueRunnableJobs();
	}

	return server;
```

- [x] **Step 3: Run typecheck**

Delete the temporary compatibility re-export:

```bash
git rm apps/backend/src/openapi.ts
```

Expected: `apps/backend/src/openapi.ts` is staged for deletion.

- [x] **Step 4: Run typecheck**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
```

Expected: PASS.

- [x] **Step 5: Run backend tests**

Run:

```bash
pnpm --filter @open-resume/backend test
```

Expected: PASS.

- [x] **Step 6: Commit**

Run:

```bash
git add apps/backend/src/server.ts apps/backend/src/openapi.ts
git commit -m "refactor(backend): wire route plugins"
```

Expected: commit succeeds.

---

### Task 6: Verify OpenAPI And Full Backend Behavior

**Files:**
- Modify if generated output changes: `apps/backend/openapi.json`

- [x] **Step 1: Regenerate OpenAPI**

Run:

```bash
pnpm --filter @open-resume/backend openapi
```

Expected:

- Command exits with code 0.
- `apps/backend/openapi.json` is generated.
- Existing route paths remain `/health`, `/profile`, `/profile/resume`, `/resumes`, `/resumes/{id}`, `/jobs`, `/jobs/{id}`, and `/jobs/{id}/retry-crawl`.
- No `/api` route prefix appears.

- [x] **Step 2: Lint OpenAPI**

Run:

```bash
pnpm --filter @open-resume/backend openapi:lint
```

Expected: PASS.

- [x] **Step 3: Run final backend verification**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
pnpm --filter @open-resume/backend test
```

Expected: both commands PASS.

- [x] **Step 4: Inspect public diff**

Run:

```bash
git diff -- apps/backend/openapi.json
```

Expected:

- Either no path/operation changes, or only tag metadata additions for `Profile` and `Resumes`.
- No URL paths are renamed.
- No operation IDs are renamed.

- [x] **Step 5: Commit generated OpenAPI if it changed**

If `apps/backend/openapi.json` changed only because of expected metadata updates, run:

```bash
git add apps/backend/openapi.json
git commit -m "docs(backend): refresh openapi metadata"
```

If `apps/backend/openapi.json` did not change, skip this commit.

---

### Task 7: Final Review

**Files:**
- Review: all changed files

- [x] **Step 1: Check working tree**

Run:

```bash
git status --short
```

Expected: no unstaged or uncommitted files unless intentionally left for user review.

- [x] **Step 2: Review final server size and responsibilities**

Run:

```bash
sed -n '1,240p' apps/backend/src/server.ts
```

Expected:

- `server.ts` creates dependencies and registers plugins.
- `server.ts` does not define endpoint handlers inline.
- `server.ts` does not contain default profile object literals.

- [x] **Step 3: Review route plugin files**

Run:

```bash
sed -n '1,260p' apps/backend/src/routes/job-routes.ts
sed -n '1,260p' apps/backend/src/routes/resume-routes.ts
sed -n '1,260p' apps/backend/src/routes/profile-routes.ts
sed -n '1,160p' apps/backend/src/routes/system-routes.ts
```

Expected:

- Each route file contains only its route group.
- Route files use `CompanionRouteContext` for dependencies.
- Route files do not read environment variables.
- Route files do not create repositories, crawl queues, or Fastify instances.

- [x] **Step 4: Final commit if review fixes were needed**

If review required fixes, commit them:

```bash
git add apps/backend/src apps/backend/openapi.json
git commit -m "fix(backend): polish route plugin refactor"
```

If no fixes were needed, skip this commit.
